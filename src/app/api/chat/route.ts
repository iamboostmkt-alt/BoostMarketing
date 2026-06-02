import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';
import { dispatchEvent, resolveMentions } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';
import { sendMail, templateMensajeClienteSinLeer } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';


const INTERNAL_ROOMS = ['TEAM', 'SUPPORT', 'PROJECT'];
const PRIVATE_CHAT_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const userSelect = { id: true, name: true, email: true, color: true, image: true, role: true } as const;
const reactionUserSelect = { id: true, name: true, color: true } as const;

const messageSelect = {
  id: true, userId: true, message: true, room: true, createdAt: true,
  fileUrl: true, fileName: true, fileType: true, taskId: true, pinned: true, isSystem: true, systemName: true,
  user:      { select: userSelect },
  reactions: { include: { user: { select: reactionUserSelect } } },
} as const;

// Validate room access: returns true if allowed.
// room = "TEAM" | "SUPPORT" | "PROJECT" | "PRIVATE" | clientId
async function checkRoomAccess(
  userId: string,
  role: string,
  email: string,
  room: string,
  workspaceId: string,
): Promise<boolean> {
  if (room === 'PRIVATE') return PRIVATE_CHAT_ROLES.includes(role);

  if (room.includes('_DM_')) {
    const parts = room.split('_DM_');
    if (!parts.includes(userId)) return false;
    // Validar que el otro usuario pertenece al mismo workspace
    const otherId = parts.find(p => p !== userId);
    if (!otherId) return false;
    const otherUser = await db.user.findFirst({
      where: { id: otherId, workspaceId, active: true },
      select: { id: true },
    });
    return !!otherUser;
  }

  if (INTERNAL_ROOMS.includes(room)) {
    if (!hasRole(role, INTERNAL_ROLES)) return false;
    // SUPPORT: todos los roles internos pueden escribir tickets
    if (room === 'SUPPORT') return true;
    // PROJECT/PRIVATE: solo PM y ADMIN
    if (['TEAM_MEMBER', 'DESIGNER', 'MARKETING'].includes(role) && room !== 'TEAM') return false;
    return true;
  }

  if (role === 'CLIENT') {
    const record = await db.client.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    return record?.id === room;
  }

  const client = await db.client.findFirst({
    where: { id: room, workspaceId },
    select: {
      id: true,
      assignedManagerId: true,
      assignedUsers: { where: { userId }, select: { userId: true } },
    },
  });
  if (!client) return false;

  if (role === 'ADMIN') return true;

  if (role === 'PROJECT_MANAGER') {
    return client.assignedManagerId === userId || client.assignedUsers.length > 0;
  }

  if (['TEAM_MEMBER', 'DESIGNER', 'MARKETING'].includes(role)) {
    return client.assignedUsers.length > 0;
  }

  return false;
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'chat-get' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const userId      = result.ctx.userId;
  const workspaceId = result.ctx.workspaceId;
  const role        = result.ctx.role  as string;
  const email       = result.ctx.email as string;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') ?? 'TEAM';
  const pinnedOnly = searchParams.get('pinned') === 'true';

  if (!(await checkRoomAccess(userId, role, email, room, workspaceId))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const messages = await db.chatMessage.findMany({
    where:   { room, workspaceId, ...(pinnedOnly ? { pinned: true } : {}) },
    take:    50,
    orderBy: { createdAt: 'desc' },
    select: messageSelect,
  });

  return NextResponse.json({ messages: messages.reverse() });
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const userId      = result.ctx.userId;
  const workspaceId = result.ctx.workspaceId;
  const role        = result.ctx.role  as string;
  const email  = result.ctx.email as string;
  const name   = result.ctx.name  as string | null;

  const body      = await req.json();
  const text      = body.message?.toString().trim() ?? '';
  const room: string = body.room ?? 'TEAM';

  if (!(await checkRoomAccess(userId, role, email, room, workspaceId))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  if (!text)              return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'El mensaje es demasiado largo.'  }, { status: 400 });

  const fileUrl: string | undefined = body.fileUrl;
  const fileName: string | undefined = body.fileName;
  const fileType: string | undefined = body.fileType;
  const isSystem: boolean = body.isSystem ?? false;
  const systemName: string | undefined = body.systemName;
  const chatMessage = await db.chatMessage.create({
    data: { userId, workspaceId, message: text, room, fileUrl, fileName, fileType, isSystem, systemName },
    select: messageSelect,
  });

  broadcastRealtime('message.sent', { message: chatMessage, room }).catch(() => undefined);

  // Si es room de cliente (clientId) y lo escribió el cliente → notificar PM si no ha leído
  if (role === 'CLIENT' && !['TEAM','SUPPORT','PROJECT','PRIVATE'].includes(room)) {
    const UNREAD_EMAIL_THRESHOLD = 3; // correo solo si lleva 3+ no leídos sin abrir
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';
    (async () => {
      const client = await db.client.findFirst({
        where: { id: room, workspaceId },
        select: { id: true, name: true, assignedManagerId: true },
      });
      if (!client) return;
      // Nombre del cliente: buscar en contactos por email
      const contact = await db.contact.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, workspaceId },
        select: { name: true },
      });
      const clientDisplayName = contact?.name ?? client.name ?? 'Tu cliente';
      // Obtener PM asignado y usuarios asignados al cliente
      type PMUser = { id: string; name: string | null; email: string | null };
      const pmList: PMUser[] = [];
      if (client.assignedManagerId) {
        const pm = await db.user.findUnique({
          where: { id: client.assignedManagerId },
          select: { id: true, name: true, email: true },
        });
        if (pm) pmList.push(pm);
      }
      const assignedUsers = await db.clientAssignedUser.findMany({
        where: { clientId: room },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      assignedUsers.forEach(au => {
        if (!pmList.find(p => p.id === au.user.id)) pmList.push(au.user);
      });
      const branding = await getBranding();
      for (const pm of pmList) {
        if (!pm.email || pm.email.endsWith('@boostmkt.com')) continue;
        const unread = await db.chatUnread.findFirst({
          where: { userId: pm.id, workspaceId, room },
          select: { count: true },
        });
        const count = unread?.count ?? 0;
        if (count === 1 || count % UNREAD_EMAIL_THRESHOLD === 0) {
          const portalUrl = `${appUrl}/dashboard/client-portal?clientId=${room}`;
          sendMail(
            pm.email,
            `💬 Mensaje de ${clientDisplayName} — revisa por favor`,
            templateMensajeClienteSinLeer(pm.name ?? 'PM', clientDisplayName, text.slice(0, 120), portalUrl, branding)
          ).catch(() => undefined);
        }
      }
    })().catch(() => undefined);
  }

  // Incrementar no leídos solo para usuarios con acceso al room
  (async () => {
    const allMembers = await db.user.findMany({
      where: { workspaceId, id: { not: userId } },
      select: { id: true, role: true, email: true },
    });
    // Filtrar solo los que tienen acceso real al room
    const eligible = await Promise.all(
      allMembers.map(async m => {
        const hasAccess = await checkRoomAccess(m.id, m.role, m.email ?? '', room, workspaceId);
        return hasAccess ? m.id : null;
      })
    );
    const validIds = eligible.filter((id): id is string => id !== null);
    await Promise.all(validIds.map(uid =>
      db.chatUnread.upsert({
        where:  { userId_workspaceId_room: { userId: uid, workspaceId, room } },
        update: { count: { increment: 1 } },
        create: { userId: uid, workspaceId, room, count: 1 },
      })
    ));
  })().catch(() => undefined);

  // Parse @mentions → notify (non-blocking)
  resolveMentions(text, userId, workspaceId)
    .then((mentionedIds) => {
      if (mentionedIds.length === 0) return;
      return dispatchEvent({
        type:           'user.mentioned',
        workspaceId,
        actorId:        userId,
        actorName:      name,
        targetUserIds:  mentionedIds,
        contextSnippet: text,
        link:           room === 'TEAM' ? '/dashboard/chat' : '/dashboard/client-portal',
      });
    })
    .catch(() => undefined);

  return NextResponse.json({ message: chatMessage }, { status: 201 });
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const userId      = result.ctx.userId;
  const workspaceId = result.ctx.workspaceId;
  const isAdmin     = result.ctx.role === 'ADMIN';

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  const msg = await db.chatMessage.findFirst({ where: { id, workspaceId } });
  if (!msg) return NextResponse.json({ error: 'Mensaje no encontrado.' }, { status: 404 });

  if (!isAdmin && msg.userId !== userId) {
    return NextResponse.json({ error: 'Solo puedes eliminar tus propios mensajes.' }, { status: 403 });
  }

  await db.chatMessage.delete({ where: { id } });
  return NextResponse.json({ message: 'Eliminado.' });
}

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'chat-patch' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const { userId, workspaceId } = result.ctx;
  const isAdmin = result.ctx.role === 'ADMIN';

  const body = await req.json();
  const messageId = body.messageId?.toString();
  const message   = body.message?.toString().trim();

  if (!messageId) return NextResponse.json({ error: 'messageId requerido.' }, { status: 400 });
  if (!message)   return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: 'Mensaje demasiado largo.' }, { status: 400 });

  const msg = await db.chatMessage.findFirst({ where: { id: messageId, workspaceId } });
  if (!msg) return NextResponse.json({ error: 'Mensaje no encontrado.' }, { status: 404 });

  if (!isAdmin && msg.userId !== userId)
    return NextResponse.json({ error: 'Solo puedes editar tus propios mensajes.' }, { status: 403 });

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data:  { message },
    select: { id: true, message: true },
  });

  return NextResponse.json({ message: updated });
}
