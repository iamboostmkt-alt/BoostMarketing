import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, taskAssignedHtml } from '@/lib/resend';

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

    const userId = (session.user as { id: string }).id;
    const userRole = session.user.role as string;
    const { searchParams } = new URL(req.url);

    const status   = searchParams.get('status');
    const priority = searchParams.get('priority');
    const scope    = searchParams.get('scope');          // 'all' → managers see everyone's tasks
    const assignee = searchParams.get('assignee');       // filter by assignedUserId
    const owner    = searchParams.get('owner');          // filter by userId (owner)

    const isManager = MANAGER_ROLES.includes(userRole);
    const isClient  = userRole === 'CLIENT';
    const showAll   = isManager && scope === 'all';

    let where: Record<string, unknown>;

    if (isClient) {
      // CLIENT: only see tasks linked to their client record (matched by email)
      const clientRecord = await db.client.findFirst({
        where: { email: { equals: session.user.email as string, mode: 'insensitive' } },
        select: { id: true },
      });
      where = clientRecord ? { clientId: clientRecord.id } : { id: 'none' };
    } else {
      where = showAll ? {} : { userId };
      if (status)   where.status   = status;
      if (priority) where.priority = priority;
      if (showAll && assignee) where.assignedUserId = assignee;
      if (showAll && owner)    where.userId         = owner;
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        user:         userInclude,
        assignedUser: userInclude,
        client:       clientInclude,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId   = (session.user as { id: string }).id;
    const userRole = session.user.role as string;
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
        dueDate:        dueDate        ? new Date(dueDate)    : null,
        startDate:      startDate      ? new Date(startDate)  : null,
        assignedUserId: isManager && assignedUserId ? assignedUserId : null,
        clientId:       isManager && clientId       ? clientId       : null,
      },
      include: {
        user:         userInclude,
        assignedUser: userInclude,
        client:       clientInclude,
      },
    });

    // Notify assignee if different from creator
    if (task.assignedUserId && task.assignedUserId !== userId) {
      await db.notification.create({
        data: {
          userId:  task.assignedUserId,
          message: `Se te asignó una nueva tarea: "${task.title}"`,
          type:    'task',
          link:    '/dashboard/tasks',
        },
      });

      // Send email to assignee (non-blocking)
      if (task.assignedUser?.email) {
        const appUrl = process.env.NEXTAUTH_URL ?? 'https://boostmarketing.vercel.app';
        sendEmail({
          to:      task.assignedUser.email,
          subject: `Nueva tarea asignada: ${task.title}`,
          html:    taskAssignedHtml({
            userName:        task.assignedUser.name ?? 'Usuario',
            taskTitle:       task.title,
            taskDescription: task.description ?? '',
            priority:        task.priority,
            dueDate:         task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-MX') : '',
            assignedBy:      session.user.name ?? 'El administrador',
            appUrl,
          }),
        }).catch(() => undefined);
      }
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
    console.error('Tasks POST error:', error);
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

    // Only owner or manager can edit
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
      where: { id },
      data:  updateData,
      include: {
        user:         userInclude,
        assignedUser: userInclude,
        client:       clientInclude,
      },
    });

    // Notify assignee if newly assigned
    if (
      updateData.assignedUserId &&
      updateData.assignedUserId !== existing.assignedUserId &&
      updateData.assignedUserId !== userId
    ) {
      await db.notification.create({
        data: {
          userId:  updateData.assignedUserId as string,
          message: `Se te asignó la tarea: "${task.title}"`,
          type:    'task',
          link:    '/dashboard/tasks',
        },
      });

      // Send email to newly assigned user (non-blocking)
      if (task.assignedUser?.email) {
        const appUrl = process.env.NEXTAUTH_URL ?? 'https://boostmarketing.vercel.app';
        sendEmail({
          to:      task.assignedUser.email,
          subject: `Tarea asignada: ${task.title}`,
          html:    taskAssignedHtml({
            userName:        task.assignedUser.name ?? 'Usuario',
            taskTitle:       task.title,
            taskDescription: task.description ?? '',
            priority:        task.priority,
            dueDate:         task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-MX') : '',
            assignedBy:      session.user.name ?? 'El administrador',
            appUrl,
          }),
        }).catch(() => undefined);
      }
    }

    // Notify owner if status changed (and owner isn't the one changing)
    if (updateData.status && updateData.status !== existing.status && existing.userId !== userId) {
      await db.notification.create({
        data: {
          userId:  existing.userId,
          message: `Tu tarea "${task.title}" cambió a estado: ${updateData.status}`,
          type:    'task',
          link:    '/dashboard/tasks',
        },
      });
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
    console.error('Tasks PUT error:', error);
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
    console.error('Tasks DELETE error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
