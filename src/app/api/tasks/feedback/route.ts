import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendMail, templateFeedbackCliente } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'task-feedback' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId, workspaceId, role } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    // Solo CLIENT puede dar feedback
    if (user.role !== 'CLIENT' && user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json();
    const { taskId, type, message } = body;

    if (!taskId || !type) {
      return NextResponse.json({ error: 'taskId y type son requeridos' }, { status: 400 });
    }

    const validTypes = ['approved', 'rejected', 'changes_requested'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'type debe ser: approved | rejected | changes_requested' }, { status: 400 });
    }

    // Verificar que la tarea existe y el cliente tiene acceso
    const task = await db.task.findFirst({
      where: { id: taskId, workspaceId: result.ctx.workspaceId },
      include: {
        client: { select: { id: true, name: true, assignedManagerId: true } },
      },
    });

    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    // Cliente solo puede dar feedback a tareas client_visible
    if (user.role === 'CLIENT' && task.visibility !== 'client_visible') {
      return NextResponse.json({ error: 'Sin acceso a esta tarea' }, { status: 403 });
    }

    // Guardar feedback
    const feedback = await db.taskFeedback.create({
      data: {
        taskId,
        userId:  user.id,
        type,
        message: message || '',
      },
    });

    // Actualizar status de la tarea según feedback
    let newStatus = task.status;
    if (type === 'approved')           newStatus = 'completed';
    if (type === 'rejected')           newStatus = 'pending';
    if (type === 'changes_requested')  newStatus = 'in_progress';

    const deliverableStatusMap: Record<string, string> = {
      approved:          'approved',
      rejected:          'client_review',
      changes_requested: 'changes_requested',
    };

    await db.task.update({
      where: { id: taskId },
      data:  {
        status:            newStatus,
        deliverableStatus: deliverableStatusMap[type] ?? null,
      },
    });

    // Enviar correo al PM con el feedback del cliente
    try {
      const pm = await db.user.findUnique({
        where: { id: task.client?.assignedManagerId || task.userId },
        select: { email: true, name: true },
      });
      if (pm?.email) {
        const branding = await getBranding(workspaceId);
        const clientName = result.ctx.name || result.ctx.email;
        await sendMail(
          pm.email,
          `Feedback de cliente: ${task.title}`,
          templateFeedbackCliente(task.title, clientName, type, message || '', branding)
        );
      }
    } catch (e) {
      console.error('[feedback mail]', e);
    }

    // Si rechazó o pidió cambios → crear change_request interna asignada al PM
    if (type === 'rejected' || type === 'changes_requested') {
      const pmId = task.client?.assignedManagerId || task.userId;

      await db.task.create({
        data: {
          userId:        pmId,
          workspaceId:   task.workspaceId,
          title:         `[Cambio solicitado] ${task.title}`,
          description:   message || `El cliente solicitó cambios en: ${task.title}`,
          priority:      'high',
          visibility:    'internal',
          isDeliverable: false,
          clientId:      task.clientId,
          parentTaskId:  task.id,
          assignedUsers: { create: [{ userId: pmId }] },
        },
      });

      // Notificar al PM
      await createNotification({
        userId: pmId, workspaceId: task.workspaceId,
        message: `Cliente solicitó cambios en: "${task.title}"`,
        type: 'task',
        actorId: user.id, actorName: user.name || result.ctx.email,
      }).catch(() => undefined);
    }

    return NextResponse.json({ feedback, newStatus });
  } catch (error) {
    console.error('[tasks/feedback POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const _r2 = await requireWorkspace();
    if (!_r2.ok) return _r2.response;
    const user = { ..._r2.ctx, id: _r2.ctx.userId };

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 });

    const feedback = await db.taskFeedback.findMany({
      where:   { taskId },
      include: { user: { select: { id: true, name: true, email: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('[tasks/feedback GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
