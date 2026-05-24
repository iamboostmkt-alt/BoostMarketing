import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { dispatchEvent, resolveMentions } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';

const INTERNAL_ROLES = ['ADMIN', 'DESIGNER', 'MARKETING', 'PROJECT_MANAGER', 'TEAM_MEMBER'];
const INTERNAL_ROOMS = ['TEAM', 'SUPPORT', 'PROJECT'];
const PRIVATE_CHAT_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const userSelect = { id: true, name: true, email: true, color: true, image: true } as const;
const reactionUserSelect = { id: true, name: true, color: true } as const;

const messageInclude = {
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
): Promise<boolean> {
  if (room === 'PRIVATE') return PRIVATE_CHAT_ROLES.includes(role);

  if (INTERNAL_ROOMS.includes(room)) {
    if (!INTERNAL_ROLES.includes(role)) return false;
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

  const client = await db.client.findUnique({
    where: { id: room },
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
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const userId      = result.ctx.userId;
  const workspaceId = result.ctx.workspaceId;
  const role        = result.ctx.role  as string;
  const email       = result.ctx.email as string;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') ?? 'TEAM';

  if (!(await checkRoomAccess(userId, role, email, room))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const messages = await db.chatMessage.findMany({
    where:   { room },
    take:    50,
    orderBy: { createdAt: 'desc' },
    include: messageInclude,
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

  if (!(await checkRoomAccess(userId, role, email, room))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  if (!text)              return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'El mensaje es demasiado largo.'  }, { status: 400 });

  const chatMessage = await db.chatMessage.create({
    data:    { userId, workspaceId, message: text, room },
    include: messageInclude,
  });

  broadcastRealtime('message.sent', { message: chatMessage, room }).catch(() => undefined);

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

  const userId  = ({ id: result.ctx.userId }).id;
  const isAdmin = result.ctx.role === 'ADMIN';

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  const msg = await db.chatMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: 'Mensaje no encontrado.' }, { status: 404 });

  if (!isAdmin && msg.userId !== userId) {
    return NextResponse.json({ error: 'Solo puedes eliminar tus propios mensajes.' }, { status: 403 });
  }

  await db.chatMessage.delete({ where: { id } });
  return NextResponse.json({ message: 'Eliminado.' });
}
