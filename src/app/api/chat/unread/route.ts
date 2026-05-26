import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';

// GET — obtener conteo de no leídos por room
export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const unreads = await db.chatUnread.findMany({
    where: { userId, workspaceId },
    select: { room: true, count: true },
  });

  const map: Record<string, number> = {};
  for (const u of unreads) map[u.room] = u.count;
  return NextResponse.json({ unreads: map });
}

// POST — marcar room como leído (resetear contador)
export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const { room } = await req.json();
  if (!room) return NextResponse.json({ error: 'room requerido' }, { status: 400 });

  await db.chatUnread.upsert({
    where:  { userId_workspaceId_room: { userId, workspaceId, room } },
    update: { count: 0, lastReadAt: new Date() },
    create: { userId, workspaceId, room, count: 0 },
  });

  return NextResponse.json({ ok: true });
}
