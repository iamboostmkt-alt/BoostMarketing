import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';
import { broadcastRealtime } from '@/lib/realtime-server';
import { z } from 'zod';

const projectInclude = {
  client:        { select: { id: true, name: true, color: true } },
  creator:       { select: { id: true, name: true, color: true, image: true } },
  assignedUsers: { include: { user: { select: { id: true, name: true, color: true, image: true, role: true } } } },
  milestones:    { select: { id: true, title: true, status: true, date: true, progress: true }, orderBy: { date: 'asc' as const } },
  _count:        { select: { tasks: true, milestones: true } },
};

const CreateSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  clientId:    z.string().optional(),
  color:       z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
  budget:      z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string(), status: z.string().optional() });

// GET — listar proyectos del workspace
export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId, userId, role } = result.ctx;

  const { searchParams } = new URL(req.url);
  const clientId  = searchParams.get('clientId');
  const status    = searchParams.get('status');
  const projectId = searchParams.get('id');

  // Un proyecto específico
  if (projectId) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        ...projectInclude,
        tasks: {
          where: { deletedAt: null, archivedAt: null },
          include: {
            assignedUsers: { include: { user: { select: { id: true, name: true, color: true, image: true } } } },
            assignedUser:  { select: { id: true, name: true, color: true, image: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        milestones: { include: { tasks: { where: { deletedAt: null }, select: { id: true, status: true } } }, orderBy: { date: 'asc' } },
      },
    });
    if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json({ project });
  }

  // Lista de proyectos
  const where: any = { workspaceId };
  if (clientId) where.clientId = clientId;
  if (status)   where.status = status;

  // PM y equipo solo ven proyectos donde están asignados o son de sus clientes
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role as string);
  if (!isManager) {
    where.OR = [
      { createdBy: userId },
      { assignedUsers: { some: { userId } } },
    ];
  }

  const projects = await db.project.findMany({
    where,
    include: projectInclude,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ projects });
}

// POST — crear proyecto
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'projects-post' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const v = CreateSchema.safeParse(body);
  if (!v.success) return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });

  const { name, description, clientId, color, startDate, endDate, budget, assignedUserIds = [] } = v.data;

  const project = await db.project.create({
    data: {
      name, workspaceId, createdBy: userId,
      description: description ?? '',
      clientId:    clientId ?? null,
      color:       color ?? '#8B5CF6',
      startDate:   startDate ? new Date(startDate) : null,
      endDate:     endDate   ? new Date(endDate)   : null,
      budget:      budget    ?? null,
      assignedUsers: assignedUserIds.length > 0
        ? { create: assignedUserIds.map(uid => ({ userId: uid })) }
        : undefined,
    },
    include: projectInclude,
  });

  broadcastRealtime('project.created', { project }).catch(() => {});
  return NextResponse.json({ project }, { status: 201 });
}

// PUT — actualizar proyecto
export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'projects-put' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const v = UpdateSchema.safeParse(body);
  if (!v.success) return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });

  const { id, assignedUserIds, ...data } = v.data;
  const existing = await db.project.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const project = await db.project.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
      ...(assignedUserIds !== undefined ? {
        assignedUsers: {
          deleteMany: {},
          create: assignedUserIds.map(uid => ({ userId: uid })),
        },
      } : {}),
    },
    include: projectInclude,
  });

  broadcastRealtime('project.updated', { project }).catch(() => {});
  return NextResponse.json({ project });
}

// DELETE — archivar proyecto
export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN'] as any });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const existing = await db.project.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.project.update({ where: { id }, data: { status: 'cancelled' } });
  return NextResponse.json({ ok: true });
}
