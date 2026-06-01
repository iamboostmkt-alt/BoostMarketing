import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'search-get' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { searchParams } = new URL(req.url);
  const q    = searchParams.get('q')?.trim() ?? '';
  const room = searchParams.get('room') ?? '';

  if (q.length < 2) return NextResponse.json({ results: [] });

  const messages = await db.chatMessage.findMany({
    where: {
      workspaceId,
      ...(room ? { room } : {}),
      message: { contains: q, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      message: true,
      room: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, color: true, image: true } },
    },
  });

  return NextResponse.json({ results: messages });
}
