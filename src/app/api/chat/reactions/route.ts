import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const VALID_EMOJI = /^\p{Emoji}/u;
const ALLOWED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'MARKETING', 'CLIENT'];

// POST — toggle a reaction (add if missing, remove if already there)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { messageId, emoji } = body;

  if (!messageId || !emoji) {
    return NextResponse.json({ error: 'messageId y emoji son requeridos.' }, { status: 400 });
  }

  if (!VALID_EMOJI.test(emoji)) {
    return NextResponse.json({ error: 'Emoji no válido.' }, { status: 400 });
  }

  const existing = await db.chatReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await db.chatReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ added: false });
  }

  await db.chatReaction.create({ data: { messageId, userId, emoji } });
  return NextResponse.json({ added: true }, { status: 201 });
}
