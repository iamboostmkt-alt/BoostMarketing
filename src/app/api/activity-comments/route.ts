import { sendMail, templateNuevoComentario } from "@/lib/mailer";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchEvent } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';

const MAX_LEN = 1000;

const userSelect = {
  user: {
    select: { id: true, name: true, email: true, color: true, image: true, role: true },
  },
} as const;

// â”€â”€ Access check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns the activity if the caller is allowed to read/write its comments.
// Throws a { status, error } object if not allowed.

async function resolveAccess(activityId: string, userId: string, role: string, email: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: {
      client: { select: { id: true, email: true, assignedManagerId: true } },
    },
  });

  if (!activity) return { error: 'Actividad no encontrada.', status: 404, activity: null };

  if (role === 'ADMIN') return { activity, error: null, status: 200 };

  if (role === 'PROJECT_MANAGER') {
    const allowed =
      activity.assignedUserId   === userId ||
      activity.createdByUserId  === userId ||
      activity.client?.assignedManagerId === userId;
    if (!allowed) return { error: 'No autorizado.', status: 403, activity: null };
    return { activity, error: null, status: 200 };
  }

  if (role === 'CLIENT') {
    if (!activity.clientId) return { error: 'No autorizado.', status: 403, activity: null };
    // Match by email (same logic as client-portal)
    const clientRecord = await db.client.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!clientRecord || clientRecord.id !== activity.clientId) {
      return { error: 'No autorizado.', status: 403, activity: null };
    }
    return { activity, error: null, status: 200 };
  }

  return { error: 'No autorizado.', status: 403, activity: null };
}

// â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
  if (!result.ok) return result.response;

    const userId      = result.ctx.userId;
    const workspaceId = result.ctx.workspaceId;
    const role        = result.ctx.role as string;
    const email       = result.ctx.email as string;

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get('activityId');
    if (!activityId) return NextResponse.json({ error: 'activityId es requerido.' }, { status: 400 });

    const { error, status } = await resolveAccess(activityId, userId, role, email);
    if (error) return NextResponse.json({ error }, { status });

    const comments = await db.activityComment.findMany({
      where:   { activityId },
      include: userSelect,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch (err) {
    console.error('[activity-comments GET]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace();
  if (!result.ok) return result.response;

    const userId      = result.ctx.userId;
    const workspaceId = result.ctx.workspaceId;
    const role        = result.ctx.role as string;
    const email       = result.ctx.email as string;

    const body = await req.json();
    const { activityId, message } = body;

    if (!activityId) return NextResponse.json({ error: 'activityId es requerido.' }, { status: 400 });
    if (!message?.trim()) return NextResponse.json({ error: 'El mensaje no puede estar vacÃ­o.' }, { status: 400 });
    if (message.trim().length > MAX_LEN) {
      return NextResponse.json({ error: `El mensaje no puede superar ${MAX_LEN} caracteres.` }, { status: 400 });
    }

    const { error, status } = await resolveAccess(activityId, userId, role, email);
    if (error) return NextResponse.json({ error }, { status });

    const comment = await db.activityComment.create({
      data: {
        activityId,
        userId,
        message: message.trim(),
      },
      include: userSelect,
    });

    // Broadcast to all open ActivityDetailModals watching this activity (non-blocking)
    broadcastRealtime('comment.created', { activityId, commentId: comment.id }).catch(() => undefined);

    // Notify participants via event system (non-blocking)
    db.activity.findUnique({
      where:   { id: activityId },
      include: { client: { select: { assignedManagerId: true } } },
    }).then((activity) => {
      if (!activity) return;
      const notifyIds = new Set<string>();
      if (activity.assignedUserId  && activity.assignedUserId  !== userId) notifyIds.add(activity.assignedUserId);
      if (activity.createdByUserId && activity.createdByUserId !== userId) notifyIds.add(activity.createdByUserId);
      if (activity.client?.assignedManagerId && activity.client.assignedManagerId !== userId) {
        notifyIds.add(activity.client.assignedManagerId);
      }
      if (notifyIds.size === 0) return;
      return dispatchEvent({
        type:          'activity.commented',
        workspaceId,
        actorId:       userId,
        actorName:     email,
        targetUserIds: [...notifyIds],
        activityTitle: activity.title,
      });
    }).catch(() => undefined);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error('[activity-comments POST]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function DELETE(req: NextRequest) {
  try {
    const result = await requireWorkspace();
  if (!result.ok) return result.response;

    const userId = result.ctx.userId;
    const role   = result.ctx.role as string;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

    const comment = await db.activityComment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado.' }, { status: 404 });

    if (role !== 'ADMIN' && comment.userId !== userId) {
      return NextResponse.json({ error: 'Solo puedes eliminar tus propios comentarios.' }, { status: 403 });
    }

    await db.activityComment.delete({ where: { id } });
    return NextResponse.json({ message: 'Comentario eliminado.' });
  } catch (err) {
    console.error('[activity-comments DELETE]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}


