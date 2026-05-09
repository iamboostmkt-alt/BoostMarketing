import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { title, description, status, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        userId,
        title,
        description: description || '',
        status: status || 'pending',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'CREATE_TASK',
        entity: 'Task',
        entityId: task.id,
        details: JSON.stringify({ title: task.title, status: task.status }),
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, title, description, status, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El id es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await db.task.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_TASK',
        entity: 'Task',
        entityId: task.id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Tasks PUT error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'El id es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId,
        action: 'DELETE_TASK',
        entity: 'Task',
        entityId: id,
        details: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Tasks DELETE error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
