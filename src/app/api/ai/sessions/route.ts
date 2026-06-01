import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const sessions = await db.aiSession.findMany({
    where: { userId, workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, model: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'ai-sessions-post' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const { title, messages, model } = await req.json();
  const session = await db.aiSession.create({
    data: { userId, workspaceId, title: title || 'Nueva conversación', messages: messages || [], model: model || 'turbo' },
    select: { id: true, title: true, model: true, updatedAt: true },
  });
  return NextResponse.json({ session }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const { id, title, messages, model } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const session = await db.aiSession.findFirst({ where: { id, userId, workspaceId } });
  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  const updated = await db.aiSession.update({
    where: { id },
    data: { ...(title && { title }), ...(messages && { messages }), ...(model && { model }) },
    select: { id: true, title: true, model: true, updatedAt: true },
  });
  return NextResponse.json({ session: updated });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const session = await db.aiSession.findFirst({ where: { id, userId, workspaceId } });
  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  await db.aiSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
