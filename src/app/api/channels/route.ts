import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(40).regex(/^[a-z0-9-_]+$/, 'Solo letras minúsculas, números y guiones'),
  icon: z.string().optional().default('hash'),
  subtitle: z.string().max(80).optional(),
});

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: 'channels-get' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const channels = await db.channel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, icon: true, subtitle: true, createdBy: true, createdAt: true },
  });

  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'channels-post' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId, userId } = result.ctx;

  const body = await req.json();
  const validation = CreateChannelSchema.safeParse(body);
  if (!validation.success)
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

  const { name, icon, subtitle } = validation.data;

  const existing = await db.channel.findFirst({ where: { workspaceId, name } });
  if (existing)
    return NextResponse.json({ error: 'Ya existe un canal con ese nombre.' }, { status: 409 });

  const channel = await db.channel.create({
    data: { workspaceId, name, icon, subtitle, createdBy: userId },
    select: { id: true, name: true, icon: true, subtitle: true },
  });

  return NextResponse.json({ channel }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'channels-delete' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId, userId } = result.ctx;
  const role = result.ctx.role as string;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  const channel = await db.channel.findFirst({ where: { id, workspaceId } });
  if (!channel) return NextResponse.json({ error: 'Canal no encontrado.' }, { status: 404 });

  if (role !== 'ADMIN' && channel.createdBy !== userId)
    return NextResponse.json({ error: 'Solo el creador o un Admin puede eliminar este canal.' }, { status: 403 });

  await db.channel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
