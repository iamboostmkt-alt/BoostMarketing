import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { rateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';
import { z } from 'zod';

const MilestoneSchema = z.object({
  projectId:   z.string(),
  title:       z.string().min(1).max(200),
  description: z.string().optional(),
  date:        z.string().optional(),
  status:      z.enum(['upcoming','in_progress','completed','blocked']).optional(),
  progress:    z.number().min(0).max(100).optional(),
});

const UpdateSchema = MilestoneSchema.partial().extend({ id: z.string() });

const include = {
  tasks: {
    where: { deletedAt: null, archivedAt: null },
    select: {
      id: true, title: true, status: true, dueDate: true,
      assignedUsers: { include: { user: { select: { id: true, name: true, color: true, image: true } } } },
    },
  },
};

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });

  const milestones = await db.milestone.findMany({
    where: { projectId, workspaceId },
    include,
    orderBy: { date: 'asc' },
  }).catch(() => []);

  return NextResponse.json({ milestones });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'proj-milestone-post' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const v = MilestoneSchema.safeParse(body);
  if (!v.success) return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });

  const { projectId, title, description, date, status, progress } = v.data;

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true, clientId: true },
  });
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });

  const milestone = await db.milestone.create({
    data: {
      projectId,
      workspaceId,
      clientId:        project.clientId ?? '',
      title,
      description:     description ?? '',
      date:            date ? new Date(date) : new Date(),
      status:          status ?? 'upcoming',
      progress:        progress ?? 0,
      type:            'milestone',
      visibleToClient: true,
    },
    include,
  });

  return NextResponse.json({ milestone }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'proj-milestone-put' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const v = UpdateSchema.safeParse(body);
  if (!v.success) return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });

  const { id, ...data } = v.data;
  const existing = await db.milestone.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const milestone = await db.milestone.update({
    where: { id },
    data: {
      ...(data.title       !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date        !== undefined && { date: new Date(data.date) }),
      ...(data.status      !== undefined && { status: data.status }),
      ...(data.progress    !== undefined && { progress: data.status === 'completed' ? 100 : data.progress }),
    },
    include,
  });

  return NextResponse.json({ milestone });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const existing = await db.milestone.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.milestone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
