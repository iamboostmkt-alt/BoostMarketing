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
  } else {
    await db.chatReaction.create({ data: { messageId, userId, emoji } });
  }
  const updatedMsg = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true, userId: true, message: true, room: true, createdAt: true,
      fileUrl: true, fileName: true, fileType: true, taskId: true,
      user: { select: { id: true, name: true, email: true, color: true, image: true, role: true } },
      reactions: { include: { user: { select: { id: true, name: true, color: true } } } },
    },
  });
  if (updatedMsg) {
    broadcastRealtime('reaction.updated', { message: updatedMsg, room: updatedMsg.room }).catch(() => {});
  }
  return NextResponse.json({ added: !existing }, { status: existing ? 200 : 201 });
}
