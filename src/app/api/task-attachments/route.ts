import { NextRequest, NextResponse } from 'next/server';
import { MANAGER_ROLES_EXT as MANAGER_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { sendMail, templateArchivoSubido } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { rateLimit } from '@/lib/security/rate-limit';
import { broadcastRealtime } from '@/lib/realtime-server';
import { sendChatBotMessage } from '@/lib/chat-bot';



export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { role } = result.ctx;
    const isManager = hasRole(role, MANAGER_ROLES);

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 });

    const includeSubtasks = searchParams.get('includeSubtasks') === 'true';

    let taskIds = [taskId];
    if (includeSubtasks) {
      const subtasks = await db.task.findMany({
        where: { parentTaskId: taskId },
        select: { id: true, title: true },
      });
      taskIds = [taskId, ...subtasks.map(s => s.id)];
    }

    const attachments = await db.taskAttachment.findMany({
      where: {
        taskId: { in: taskIds },
        status: 'active',
        ...(!isManager && { isInternal: false }),
      },
      include: {
        user: { select: { id: true, name: true, image: true, color: true } },
        task: { select: { id: true, title: true, parentTaskId: true } },
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
    const task = await db.task.findFirst({
      where: { id: taskId, workspaceId: result.ctx.workspaceId },
      include: { assignedUsers: true },
    });
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const role = result.ctx.role as string;
    const isManager = hasRole(role, MANAGER_ROLES);
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
          workspaceId: result.ctx.workspaceId,
          message: `📎 ${result.ctx.name} adjuntó "${fileName}" en la tarea`,
          type: 'task',
          link: '/dashboard/tasks',
        })),
        skipDuplicates: true,
      });
    }

    // Correo al PM/creador de la tarea
    if (notifyIds.size > 0) {
      getBranding().then(async (b) => {
        const recipients = await db.user.findMany({
          where: { id: { in: Array.from(notifyIds) } },
          select: { email: true, name: true },
        });
        const parentTitle = task.parentTaskId
          ? (await db.task.findUnique({ where: { id: task.parentTaskId }, select: { title: true } }))?.title
          : undefined;
        for (const r of recipients) {
          if (!r.email || r.email.endsWith('@boostmkt.com')) continue;
          await sendMail(
            r.email,
            `📎 Nuevo archivo en tarea: ${task.title}`,
            templateArchivoSubido(task.title, result.ctx.name ?? 'Un miembro', fileName, fileUrl, parentTitle, b)
          );
        }
      }).catch(console.error);
    }

    // Mensaje en chat del cliente con el archivo adjunto
    if (task.clientId) {
      const uploaderName = result.ctx.name || 'Un miembro del equipo';
      const isImage = fileType?.startsWith('image/');
      const isVideo = fileType?.startsWith('video/');
      const typeLabel = isImage ? '🖼️' : isVideo ? '🎬' : '📎';
      const allAssignedIds = [
        task.userId,
        ...(task.assignedUsers?.map((au: any) => au.userId) || []),
      ].filter((id: string) => id !== result.ctx.userId);

      sendChatBotMessage({
        workspaceId: result.ctx.workspaceId,
        message: `${typeLabel} **${uploaderName}** subió entrega en **"${task.title}"**:\n👉 Por favor revísala y aprueba o solicita cambios`,
        clientId: task.clientId,
        assignedUserIds: allAssignedIds,
        senderId: result.ctx.userId,
        fileUrl,
        fileName,
        fileType,
        isInternal: false,
      }).catch(() => {});
    }

    // Broadcast FILE_UPLOADED para toasts en tiempo real (non-blocking)
    broadcastRealtime('file.uploaded', {
      file: { fileName, fileUrl, fileType, taskId },
      taskTitle: task.title,
      uploadedBy: result.ctx.name || result.ctx.email,
    }).catch(() => {});
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error('[task-attachments POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'task-attachments-delete' });
  if (!rl.success) return rl.response;
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    // BUG-02 fix: usar findFirst con workspaceId para asegurar que el attachment
    // pertenece al workspace del usuario (evita 404 silencioso con findUnique sin scope)
    const attachment = await db.taskAttachment.findFirst({
      where: { id, task: { workspaceId } },
    });
    if (!attachment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const role = result.ctx.role as string;
    const isManager = hasRole(role, MANAGER_ROLES);
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

export async function PATCH(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'task-attachments-patch' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const body = await req.json();
  const { reviewStatus, reviewComment } = body;
  if (!reviewStatus || !['approved', 'changes_requested', 'pending'].includes(reviewStatus))
    return NextResponse.json({ error: 'reviewStatus inválido' }, { status: 400 });
  // Verificar que el attachment pertenece al workspace
  const attachment = await db.taskAttachment.findFirst({
    where: { id, task: { workspaceId } },
  });
  if (!attachment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const updated = await db.taskAttachment.update({
    where: { id },
    data: {
      reviewStatus,
      reviewComment: reviewComment ?? null,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ attachment: updated });
}
