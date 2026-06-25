import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import crypto from 'crypto';

const VALID_EVENTS = [
  'task.created','task.updated','task.completed','task.approved','task.changes_requested',
  'client.created','client.updated',
  'project.created','project.completed',
  'meeting.created',
  'member.invited',
  'attachment.uploaded',
];

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth.ctx;

  const webhooks = await (db as any).webhookSubscription.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ webhooks, validEvents: VALID_EVENTS });
}

export async function POST(req: NextRequest) {
  const auth = await requireWorkspace({ roles: ['ADMIN'] });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth.ctx;

  const body = await req.json();
  const { name, url, events = [], secret } = body;

  if (!name || !url) return NextResponse.json({ error: 'name y url requeridos' }, { status: 400 });
  if (!url.startsWith('https://')) return NextResponse.json({ error: 'URL debe ser HTTPS' }, { status: 400 });

  const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) return NextResponse.json({ error: `Eventos inválidos: ${invalidEvents.join(', ')}` }, { status: 400 });

  const existing = await (db as any).webhookSubscription.count({ where: { workspaceId } });
  if (existing >= 10) return NextResponse.json({ error: 'Máximo 10 webhooks por workspace' }, { status: 400 });

  const webhook = await (db as any).webhookSubscription.create({
    data: {
      workspaceId,
      name,
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString('hex'),
      active: true,
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireWorkspace({ roles: ['ADMIN'] });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth.ctx;

  const { id, active, name, url, events } = await req.json();
  const wh = await (db as any).webhookSubscription.findFirst({ where: { id, workspaceId } });
  if (!wh) return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });

  const updated = await (db as any).webhookSubscription.update({
    where: { id },
    data: {
      ...(active !== undefined ? { active } : {}),
      ...(name ? { name } : {}),
      ...(url ? { url } : {}),
      ...(events ? { events } : {}),
    },
  });

  return NextResponse.json({ webhook: updated });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireWorkspace({ roles: ['ADMIN'] });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const wh = await (db as any).webhookSubscription.findFirst({ where: { id, workspaceId } });
  if (!wh) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await (db as any).webhookSubscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
