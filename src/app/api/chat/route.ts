import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const INTERNAL_ROLES = ['ADMIN', 'DESIGNER', 'MARKETING', 'PROJECT_MANAGER'];

async function requireInternal() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!INTERNAL_ROLES.includes(session.user.role ?? '')) return null;
  return session;
}

const userSelect = {
  id:    true,
  name:  true,
  email: true,
  color: true,
  image: true,
} as const;

// GET — last 50 messages (newest first, UI reverses for display)
export async function GET() {
  const session = await requireInternal();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const messages = await db.chatMessage.findMany({
    take:    50,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: userSelect } },
  });

  // Return in chronological order (oldest first)
  return NextResponse.json({ messages: messages.reverse() });
}

// POST — send a message
export async function POST(req: NextRequest) {
  const session = await requireInternal();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const message = body.message?.toString().trim();

  if (!message) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });
  }

  const chatMessage = await db.chatMessage.create({
    data:    { userId, message },
    include: { user: { select: userSelect } },
  });

  return NextResponse.json({ message: chatMessage }, { status: 201 });
}

// DELETE — delete own message (admin can delete any)
export async function DELETE(req: NextRequest) {
  const session = await requireInternal();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

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
