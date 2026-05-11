import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchEvent } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

const clientInclude = {
  select: { id: true, name: true, company: true },
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId   = (session.user as { id: string }).id;
    const userRole = session.user.role as string;
    const { searchParams } = new URL(req.url);

    const status   = searchParams.get('status');
    const priority = searchParams.get('priority');
    const scope    = searchParams.get('scope');
    const assignee = searchParams.get('assignee');
    const owner    = searchParams.get('owner');

    const isManager = MANAGER_ROLES.includes(userRole);
    const isClient  = userRole === 'CLIENT';
    const showAll   = isManager && scope === 'all';

    let where: Record<string, unknown>;

    if (isClient) {
      const clientRecord = await db.client.findFirst({
        where: { email: { equals: session.user.email as string, mode: 'insensitive' } },
        select: { id: true },
      });
      where = clientRecord ? { clientId: clientRecord.id } : { id: 'none' };
    } else {
      where = showAll ? {} : { userId };
      if (status)              where.status         = status;
      if (priority)            where.priority       = priority;
      if (showAll && assignee) where.assignedUserId = assignee;
      if (showAll && owner)    where.userId         = owner;
    }

    const tasks = await db.task.findMany({
      where,
      include: { user: userInclude, assignedUser: userInclude, client: clientInclude },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[tasks GET]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userRole  = session.user.role as string;
    const isManager = MANAGER_ROLES.includes(userRole);

    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, assignedUserId, clientId } = body;

    if (!title) return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });

    const task = await db.task.create({
      data: {
        userId,
        title,
        description:    description    || '',
        status:         status         || 'pending',
        priority:       priority       || 'medium',
        dueDate:        dueDate        ? new Date(dueDate)   : null,
        startDate:      startDate      ? new Date(startDate) : null,
        assignedUserId: isManager && assignedUserId ? assignedUserId : null,
        clientId:       isManager && clientId       ? clientId       : null,
      },
      include: { user: userInclude, assignedUser: userInclude, client: clientInclude },
    });

    broadcastRealtime('task.created', { task }).catch(() => undefined);

    // Notify assignee via event system (non-blocking)
    if (task.assignedUserId && task.assignedUserId !== userId) {
      dispatchEvent({
        type:            'task.assigned',
        actorId:         userId,
        actorName:       session.user.name,
        targetUserId:    task.assignedUserId,
        taskTitle:       task.title,
        taskDescription: task.description,
        priority:        task.priority,
        dueDate:         task.dueDate
          ? new Date(task.dueDate).toLocaleDateString('es-MX')
          : undefined,
        assigneeEmail: task.assignedUser?.email,
        assigneeName:  task.assignedUser?.name,
      }).catch(() => undefined);
    }

    await db.activityLog.create({
      data: {
        userId,
        action:   'CREATE_TASK',
        entity:   'Task',
        entityId: task.id,
        details:  JSON.stringify({ title: task.title, status: task.status }),
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[tasks POST]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userRole  = session.user.role as string;
    const isManager = MANAGER_ROLES.includes(userRole);

    const body = await req.json();
    const { id, title, description, status, priority, dueDate, startDate, assignedUserId, clientId } = body;

    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!isManager && existing.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso para editar esta tarea' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (title       !== undefined) updateData.title       = title;
    if (description !== undefined) updateData.description = description;
    if (status      !== undefined) updateData.status      = status;
    if (priority    !== undefined) updateData.priority    = priority;
    if (dueDate     !== undefined) updateData.dueDate     = dueDate   ? new Date(dueDate)   : null;
    if (startDate   !== undefined) updateData.startDate   = startDate ? new Date(startDate) : null;
    if (isManager && assignedUserId !== undefined) updateData.assignedUserId = assignedUserId || null;
    if (isManager && clientId       !== undefined) updateData.clientId       = clientId       || null;

    const task = await db.task.update({
      where:   { id },
      data:    updateData,
      include: { user: userInclude, assignedUser: userInclude, client: clientInclude },
    });

    broadcastRealtime('task.updated', { task }).catch(() => undefined);

    // Newly assigned → notify via event system
    if (
      updateData.assignedUserId &&
      updateData.assignedUserId !== existing.assignedUserId &&
      updateData.assignedUserId !== userId
    ) {
      dispatchEvent({
        type:          'task.assigned',
        actorId:       userId,
        actorName:     session.user.name,
        targetUserId:  updateData.assignedUserId as string,
        taskTitle:     task.title,
        taskDescription: task.description,
        priority:      task.priority,
        dueDate:       task.dueDate
          ? new Date(task.dueDate).toLocaleDateString('es-MX')
          : undefined,
        assigneeEmail: task.assignedUser?.email,
        assigneeName:  task.assignedUser?.name,
      }).catch(() => undefined);
    }

    // Status changed → notify owner
    if (updateData.status && updateData.status !== existing.status && existing.userId !== userId) {
      dispatchEvent({
        type:         'task.status_changed',
        actorId:      userId,
        actorName:    session.user.name,
        targetUserId: existing.userId,
        taskTitle:    task.title,
        newStatus:    updateData.status as string,
      }).catch(() => undefined);
    }

    await db.activityLog.create({
      data: {
        userId,
        action:   'UPDATE_TASK',
        entity:   'Task',
        entityId: task.id,
        details:  JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('[tasks PUT]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userRole  = session.user.role as string;
    const isManager = MANAGER_ROLES.includes(userRole);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!isManager && existing.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso para eliminar esta tarea' }, { status: 403 });
    }

    await db.task.delete({ where: { id } });

    broadcastRealtime('task.deleted', { id }).catch(() => undefined);

    await db.activityLog.create({
      data: {
        userId,
        action:   'DELETE_TASK',
        entity:   'Task',
        entityId: id,
        details:  JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('[tasks DELETE]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
