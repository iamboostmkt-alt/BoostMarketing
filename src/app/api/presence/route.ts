import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { broadcastRealtime } from '@/lib/realtime-server';

// GET — all users' presence (internal staff only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const presences = await db.userPresence.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, color: true, image: true } },
    },
  });

  return NextResponse.json({ presences });
}

// PATCH — heartbeat / status update for the current user
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
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
    name:  session.user.name,
    email: session.user.email,
  }).catch(() => undefined);

  return NextResponse.json({ presence });
}
