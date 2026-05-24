import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'];

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { role } = result.ctx;
    const isManager = MANAGER_ROLES.includes(role);

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 });

    const attachments = await db.taskAttachment.findMany({
      where: {
        taskId,
        status: 'active',
        ...(!isManager && { isInternal: false }),
      },
      include: {
        user: { select: { id: true, name: true, image: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('[task-attachments GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;

    const body = await req.json();
    const { taskId, fileName, fileUrl, fileType, fileSize, isInternal } = body;

    if (!taskId || !fileName || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    // Verify task exists and user has access
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assignedUsers: true },
    });
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const role = result.ctx.role as string;
    const isManager = MANAGER_ROLES.includes(role);
    const isAssigned = task.assignedUsers.some(au => au.userId === result.ctx.userId) || task.assignedUserId === result.ctx.userId;

    if (!isManager && !isAssigned) {
      return NextResponse.json({ error: 'Sin acceso a esta tarea' }, { status: 403 });
    }

    const attachment = await db.taskAttachment.create({
      data: {
        taskId,
        userId: result.ctx.userId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        isInternal: isInternal || false,
        status: 'active',
      },
      include: {
        user: { select: { id: true, name: true, image: true, color: true } },
      },
    });

    // Notify task owner and assigned users
    const notifyIds = new Set<string>();
    if (task.userId !== result.ctx.userId) notifyIds.add(task.userId);
    if (task.assignedUserId && task.assignedUserId !== result.ctx.userId) notifyIds.add(task.assignedUserId);
    task.assignedUsers.forEach(au => { if (au.userId !== result.ctx.userId) notifyIds.add(au.userId); });

    if (notifyIds.size > 0) {
      await db.notification.createMany({
        data: Array.from(notifyIds).map(userId => ({
          userId,
          message: `📎 ${result.ctx.name} adjuntó "${fileName}" en la tarea`,
          type: 'task',
          link: '/dashboard/tasks',
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error('[task-attachments POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const attachment = await db.taskAttachment.findUnique({ where: { id } });
    if (!attachment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const role = result.ctx.role as string;
    const isManager = MANAGER_ROLES.includes(role);
    const isOwner = attachment.userId === result.ctx.userId;

    if (!isManager && !isOwner) {
      return NextResponse.json({ error: 'Sin permiso para eliminar' }, { status: 403 });
    }

    await db.taskAttachment.update({
      where: { id },
      data: { status: 'deleted' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[task-attachments DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
