import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';

const userSelect = { id: true, name: true, email: true, color: true, image: true } as const;

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const parentId = req.nextUrl.searchParams.get('parentId');
  if (!parentId) return NextResponse.json({ error: 'parentId requerido' }, { status: 400 });
  const replies = await db.chatMessage.findMany({
    where: { parentId, workspaceId },
    select: {
      id: true, userId: true, message: true, createdAt: true,
      fileUrl: true, fileName: true, fileType: true,
      user: { select: userSelect },
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'chat-replies' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;
  const body = await req.json();
  const { message, parentId, room } = body;
  if (!message?.trim() || !parentId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const reply = await db.chatMessage.create({
    data: { userId, workspaceId, message: message.trim(), room: room || 'TEAM', parentId },
    select: {
      id: true, userId: true, message: true, createdAt: true,
      fileUrl: true, fileName: true, fileType: true,
      user: { select: userSelect },
    },
  });
  return NextResponse.json({ reply });
}
