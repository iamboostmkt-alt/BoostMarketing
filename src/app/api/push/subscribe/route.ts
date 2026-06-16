import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { z } from 'zod';

const Schema = z.object({
  endpoint:  z.string().url(),
  keys:      z.object({ p256dh: z.string(), auth: z.string() }),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (!auth.ok) return auth.response;
    const { userId, workspaceId } = auth.ctx;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    const { endpoint, keys, userAgent } = parsed.data;

    await (db as any).pushSubscription.upsert({
      where:  { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent || null, updatedAt: new Date() },
      create: {
        id:          `ps_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId, workspaceId, endpoint,
        p256dh:  keys.p256dh,
        auth:    keys.auth,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[push/subscribe]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (!auth.ok) return auth.response;
    const { userId } = auth.ctx;

    const { endpoint } = await req.json();
    await (db as any).pushSubscription.deleteMany({ where: { endpoint, userId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
