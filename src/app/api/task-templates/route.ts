import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { MANAGER_ROLES } from '@/core/constants/roles';

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const templates = await db.taskTemplate.findMany({
      where: {
        isActive: true,
        ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}),
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[task-templates GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const _rq = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!_rq.ok) return _rq.response;
    const user = { ..._rq.ctx, id: _rq.ctx.userId };

    const body = await req.json();
    const { title, description, category, visibility, priority, subtasks, estimatedDays } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título requerido' }, { status: 400 });
    }

    const template = await db.taskTemplate.create({
      data: {
        userId:        user.id,
        title:         title.trim(),
        description:   description   || '',
        category:      category      || 'general',
        visibility:    visibility    || 'internal',
        priority:      priority      || 'medium',
        subtasks:      Array.isArray(subtasks) ? subtasks : [],
        estimatedDays: estimatedDays || 0,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('[task-templates POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const _r = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!_r.ok) return _r.response;
    const user = { ..._r.ctx, id: _r.ctx.userId };

    const body = await req.json();
    const { id, title, description, category, visibility, priority, subtasks, estimatedDays, isActive } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const template = await db.taskTemplate.update({
      where: { id },
      data: {
        ...(title         !== undefined && { title }),
        ...(description   !== undefined && { description }),
        ...(category      !== undefined && { category }),
        ...(visibility    !== undefined && { visibility }),
        ...(priority      !== undefined && { priority }),
        ...(subtasks      !== undefined && { subtasks }),
        ...(estimatedDays !== undefined && { estimatedDays }),
        ...(isActive      !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[task-templates PUT]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const _r = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!_r.ok) return _r.response;
    const user = { ..._r.ctx, id: _r.ctx.userId };

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // Soft delete — solo desactiva
    await db.taskTemplate.update({
      where: { id },
      data:  { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[task-templates DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
