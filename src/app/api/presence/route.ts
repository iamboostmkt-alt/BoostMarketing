import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { broadcastRealtime } from '@/lib/realtime-server';

// GET â€” all users' presence (internal staff only)
export async function GET() {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const presences = await db.userPresence.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, color: true, image: true } },
    },
  });

  return NextResponse.json({ presences });
}

// PATCH â€” heartbeat / status update for the current user
export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const { userId } = result.ctx;
  const body   = await req.json().catch(() => ({}));
  const status = (body.status === 'offline' ? 'offline' : 'online') as 'online' | 'offline';

  const presence = await db.userPresence.upsert({
    where:  { userId },
    create: { userId, status, lastSeen: new Date() },
    update: { status, lastSeen: new Date() },
  });

  // Broadcast so other clients update their presence indicators (non-blocking)
  broadcastRealtime('presence.updated', {
    userId,
    status,
    name:  result.ctx.name,
    email: result.ctx.email,
  }).catch(() => undefined);

  return NextResponse.json({ presence });
}
