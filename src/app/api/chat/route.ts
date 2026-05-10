import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchEvent, resolveMentions } from '@/lib/events';

const INTERNAL_ROLES = ['ADMIN', 'DESIGNER', 'MARKETING', 'PROJECT_MANAGER'];

const userSelect = { id: true, name: true, email: true, color: true, image: true } as const;
const reactionUserSelect = { id: true, name: true, color: true } as const;

const messageInclude = {
  user:      { select: userSelect },
  reactions: { include: { user: { select: reactionUserSelect } } },
} as const;

// Validate room access: returns the room string or null if denied.
// room = "TEAM" | clientId string
async function checkRoomAccess(
  role: string,
  email: string,
  room: string,
): Promise<boolean> {
  if (room === 'TEAM') return INTERNAL_ROLES.includes(role);

  // Client room (clientId)
  if (role === 'CLIENT') {
    const record = await db.client.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    return record?.id === room;
  }

  return INTERNAL_ROLES.includes(role);
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const role  = session.user.role  as string;
  const email = session.user.email as string;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') ?? 'TEAM';

  if (!(await checkRoomAccess(role, email, room))) {
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
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const role   = session.user.role  as string;
  const email  = session.user.email as string;
  const name   = session.user.name  as string | null;

  const body      = await req.json();
  const text      = body.message?.toString().trim() ?? '';
  const room: string = body.room ?? 'TEAM';

  if (!(await checkRoomAccess(role, email, room))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  if (!text)              return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'El mensaje es demasiado largo.'  }, { status: 400 });

  const chatMessage = await db.chatMessage.create({
    data:    { userId, message: text, room },
    include: messageInclude,
  });

  // Parse @mentions → notify (non-blocking)
  resolveMentions(text, userId)
    .then((mentionedIds) => {
      if (mentionedIds.length === 0) return;
      return dispatchEvent({
        type:           'user.mentioned',
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
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const userId  = (session.user as { id: string }).id;
  const isAdmin = session.user.role === 'ADMIN';

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
