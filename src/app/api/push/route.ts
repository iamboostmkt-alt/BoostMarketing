import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';

// POST — guardar suscripción push del browser
export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Datos de suscripción incompletos' }, { status: 400 });
  }

  // Upsert por endpoint único
  await (db as any).pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      workspaceId,
      endpoint,
      p256dh:    keys.p256dh,
      auth:      keys.auth,
      userAgent: userAgent ?? null,
    },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth:   keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — eliminar suscripción (cuando el usuario niega permisos)
export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 });

  await (db as any).pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
