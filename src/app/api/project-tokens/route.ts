import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// GET — obtener tokens de un proyecto
export async function GET(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });

  const tokens = await db.projectToken.findMany({
    where: { projectId, workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ tokens });
}

// POST — crear nuevo token
export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { projectId, label, expiresInDays } = await req.json();
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });

  // Verificar que el proyecto pertenece al workspace
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });

  const token = randomBytes(24).toString('base64url');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await db.projectToken.create({
    data: { token, projectId, workspaceId, label: label || 'Enlace cliente', expiresAt },
  });

  return NextResponse.json({ token: created });
}

// PATCH — activar/desactivar token
export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { id, active } = await req.json();
  const updated = await db.projectToken.updateMany({
    where: { id, workspaceId },
    data: { active },
  });
  return NextResponse.json({ updated });
}

// DELETE — eliminar token
export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await db.projectToken.deleteMany({ where: { id, workspaceId } });
  return NextResponse.json({ ok: true });
}
