import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';
import { MANAGER_ROLES } from '@/core/constants/roles';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
