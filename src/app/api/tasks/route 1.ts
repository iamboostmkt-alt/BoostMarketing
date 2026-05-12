import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchEvent } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';
import { normalizeTaskStatus } from '@/lib/task-status';


const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const userInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

const clientInclude = {
  select: { id: true, name: true, company: true },
} as const;

const assignedUsersInclude = {
  include: {
    user: { select: { id: true, name: true, email: true, color: true, image: true } },
  },
} as const;

async function syncTaskAssignees(taskId: string, userIds: string[]) {
  await db.taskAssignedUser.deleteMany({ where: { taskId } });
  if (userIds.length === 0) return;
  await db.taskAssignedUser.createMany({
    data: userIds.map((userId) => ({ taskId, userId })),
    skipDuplicates: true,
  });
}

function flatTaskAssignees(raw: { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[]) {
  return raw.map((r) => r.user);
}

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
    const limitRaw = searchParams.get('limit');
    const take     = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 0)) : undefined;

    const isManager = MANAGER_ROLES.includes(userRole);
    const isClient  = userRole === 'CLIENT';
    const showAll   = isManager && scope === 'all';

    const notDeleted = { deletedAt: null as Date | null };

    let where: Record<string, unknown>;

    if (isClient) {
      const clientRecord = await db.client.findFirst({
        where: { email: { equals: session.user.email as string, mode: 'insensitive' } },
        select: { id: true },
      });
      where = clientRecord
        ? { ...notDeleted, clientId: clientRecord.id }
        : { ...notDeleted, id: 'none' };
    } else if (showAll) {
      where = { ...notDeleted };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assignee) where.assignedUserId = assignee;
      if (owner) where.userId = owner;
    } else {
      where = {
        ...notDeleted,
        OR: [
          { userId },
          { assignedUserId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      };
      if (status) where.status = status;
      if (priority) where.priority = priority;
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        user:          userInclude,
        assignedUser:  userInclude,
        client:        clientInclude,
        assignedUsers: assignedUsersInclude,
      },
      orderBy: { createdAt: 'desc' },
      ...(take ? { take } : {}),
    });

    const result = tasks.map((t) => ({
      ...t,
      status: normalizeTaskStatus(t.status),
      assignedUsers: flatTaskAssignees(t.assignedUsers),
    }));

    return NextResponse.json({ tasks: result });
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
    const { title, description, status, priority, dueDate, startDate, assignedUserId, assignedUserIds, clientId } = body;

    if (!title) return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });

    // Resolve primary assignee: prefer first of multi-select, fall back to single select
    const multiIds: string[] = isManager && Array.isArray(assignedUserIds) ? assignedUserIds : [];
    const primaryAssigneeId  = isManager
      ? (multiIds[0] ?? (assignedUserId || null))
      : null;

    const task = await db.task.create({
      data: {
        userId,
        title,
        description:    description    || '',
        status:         normalizeTaskStatus(status),
        priority:       priority       || 'medium',
        dueDate:        dueDate        ? new Date(dueDate)   : null,
        startDate:      startDate      ? new Date(startDate) : null,
        assignedUserId: primaryAssigneeId,
        clientId:       isManager && clientId ? clientId : null,
      },
      include: { user: userInclude, assignedUser: userInclude, client: clientInclude },
    });

    // Sync multi-assignee pivot
    if (isManager && multiIds.length > 0) {
      await syncTaskAssignees(task.id, multiIds);
    }

    broadcastRealtime('task.created', { task }).catch(() => undefined);

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

    // Return with flat assignedUsers
    const withAssignees = await db.task.findUnique({
      where: { id: task.id },
      include: {
        user:          userInclude,
        assignedUser:  userInclude,
        client:        clientInclude,
        assignedUsers: assignedUsersInclude,
      },
    });

    return NextResponse.json({
      task: {
        ...withAssignees,
        status:        normalizeTaskStatus(withAssignees?.status),
        assignedUsers: flatTaskAssignees(withAssignees?.assignedUsers ?? []),
      },
    }, { status: 201 });
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
    const { id, title, description, status, priority, dueDate, startDate, assignedUserId, assignedUserIds, clientId } = body;

    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const existing = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const assigneeLink = await db.taskAssignedUser.findFirst({
      where: { taskId: id, userId },
    });
    const isParticipant =
      existing.userId === userId ||
      existing.assignedUserId === userId ||
      !!assigneeLink;

    if (!isManager && !isParticipant) {
      return NextResponse.json({ error: 'Sin permiso para editar esta tarea' }, { status: 403 });
    }

    const assigneeOnly = !isManager && isParticipant && existing.userId !== userId;
    if (assigneeOnly) {
      const forbidden = Object.keys(body).filter(
        (k) =>
          body[k] !== undefined &&
          !['id', 'status'].includes(k)
      );
      if (forbidden.length > 0) {
        return NextResponse.json(
          { error: 'Solo puedes actualizar el estado de esta tarea.' },
          { status: 403 }
        );
      }
    }

    const multiIds: string[] = isManager && Array.isArray(assignedUserIds) ? assignedUserIds : [];
    const primaryAssigneeId  = multiIds.length > 0 ? multiIds[0] : (assignedUserId !== undefined ? (assignedUserId || null) : undefined);

    const updateData: Record<string, unknown> = {};
    if (!assigneeOnly && title       !== undefined) updateData.title       = title;
    if (!assigneeOnly && description !== undefined) updateData.description = description;
    if (status      !== undefined) updateData.status      = normalizeTaskStatus(status as string);
    if (!assigneeOnly && priority    !== undefined) updateData.priority    = priority;
    if (!assigneeOnly && dueDate     !== undefined) updateData.dueDate     = dueDate   ? new Date(dueDate)   : null;
    if (!assigneeOnly && startDate   !== undefined) updateData.startDate   = startDate ? new Date(startDate) : null;

    if (isManager && primaryAssigneeId !== undefined) updateData.assignedUserId = primaryAssigneeId;
    if (isManager && clientId !== undefined) updateData.clientId = clientId || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const task = await db.task.update({
      where:   { id },
      data:    updateData,
      include: { user: userInclude, assignedUser: userInclude, client: clientInclude },
    });

    // Sync multi-assignee pivot if provided
    if (isManager && Array.isArray(assignedUserIds)) {
      await syncTaskAssignees(id, multiIds);
    }

    broadcastRealtime('task.updated', { task }).catch(() => undefined);

    if (
      updateData.assignedUserId &&
      updateData.assignedUserId !== existing.assignedUserId &&
      updateData.assignedUserId !== userId
    ) {
      dispatchEvent({
        type:            'task.assigned',
        actorId:         userId,
        actorName:       session.user.name,
        targetUserId:    updateData.assignedUserId as string,
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

    const withAssignees = await db.task.findUnique({
      where: { id: task.id },
      include: {
        user:          userInclude,
        assignedUser:  userInclude,
        client:        clientInclude,
        assignedUsers: assignedUsersInclude,
      },
    });

    return NextResponse.json({
      task: {
        ...withAssignees,
        status:        normalizeTaskStatus(withAssignees?.status),
        assignedUsers: flatTaskAssignees(withAssignees?.assignedUsers ?? []),
      },
    });
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

    const existing = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!isManager && existing.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso para eliminar esta tarea' }, { status: 403 });
    }

    await db.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

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
