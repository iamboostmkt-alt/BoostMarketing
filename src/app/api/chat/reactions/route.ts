import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { broadcastRealtime } from '@/lib/realtime-server';

const VALID_EMOJI = /^\p{Emoji}/u;
const ALLOWED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING', 'CLIENT'];

// POST — toggle a reaction (add if missing, remove if already there)
export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, role } = result.ctx;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }
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
