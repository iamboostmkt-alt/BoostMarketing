import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';
import { broadcastRealtime } from '@/lib/realtime-server';

const INDIVIDUAL_TIMEOUT_MS = 5  * 60 * 1000; // 5 min
const GROUP_TIMEOUT_MS      = 10 * 60 * 1000; // 10 min

// GET: verificar si hay sesión activa en un room
export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const room = new URL(req.url).searchParams.get('room');
  if (!room) return NextResponse.json({ session: null });

  const session = await db.aiSession.findFirst({
    where: {
      room,
      workspaceId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true, mode: true, activatedBy: true,
      expiresAt: true, lastActivity: true,
    },
  });
  return NextResponse.json({ session });
}

// POST: activar sesión IA en un room
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'ai-session-post' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const { room, mode } = await req.json() as { room: string; mode: 'individual' | 'group' };
  if (!room || !['individual','group'].includes(mode))
    return NextResponse.json({ error: 'room y mode requeridos' }, { status: 400 });

  const timeoutMs = mode === 'group' ? GROUP_TIMEOUT_MS : INDIVIDUAL_TIMEOUT_MS;
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + timeoutMs);

  // Desactivar sesión previa en el mismo room
  await db.aiSession.updateMany({
    where: { room, workspaceId, active: true },
    data:  { active: false },
  });

  const session = await db.aiSession.create({
    data: {
      userId,
      workspaceId,
      room,
      mode,
      active:      true,
      activatedBy: userId,
      lastActivity: now,
      expiresAt,
      title: `Chat ${mode} — ${room}`,
    },
  });

  // Broadcast para que todos en el room vean el badge
  broadcastRealtime('ai.session.started', {
    room, mode, sessionId: session.id,
    activatedBy: result.ctx.name || result.ctx.email,
    expiresAt: expiresAt.toISOString(),
  }).catch(() => {});

  return NextResponse.json({ session });
}

// DELETE: desactivar sesión IA en un room
export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const room = new URL(req.url).searchParams.get('room');
  if (!room) return NextResponse.json({ ok: true });

  await db.aiSession.updateMany({
    where: { room, workspaceId, active: true },
    data:  { active: false },
  });

  broadcastRealtime('ai.session.ended', { room }).catch(() => {});
  return NextResponse.json({ ok: true });
}

// PATCH: renovar el timeout (bump lastActivity)
export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const { room, sessionId } = await req.json() as { room: string; sessionId: string };
  if (!room || !sessionId) return NextResponse.json({ ok: true });

  const session = await db.aiSession.findFirst({
    where: { id: sessionId, workspaceId, active: true },
    select: { mode: true },
  });
  if (!session) return NextResponse.json({ ok: true });

  const timeoutMs = session.mode === 'group' ? GROUP_TIMEOUT_MS : INDIVIDUAL_TIMEOUT_MS;
  const now       = new Date();
  await db.aiSession.update({
    where: { id: sessionId },
    data: {
      lastActivity: now,
      expiresAt:    new Date(now.getTime() + timeoutMs),
    },
  });
  return NextResponse.json({ ok: true });
}
