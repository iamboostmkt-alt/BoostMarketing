import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TASK_STATUS } from '@/lib/constants/status';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 dias

  // Buscar tareas completadas/canceladas hace mas de 15 dias
  const doneTasks = await db.task.findMany({
    where: {
      status: { in: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
      updatedAt: { lt: cutoff },
      workspaceId: { not: undefined },
    },
    select: { id: true },
  });

  if (doneTasks.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, message: 'No hay archivos para limpiar' });
  }

  const taskIds = doneTasks.map(t => t.id);

  // Marcar como pending_delete primero
  const marked = await db.taskAttachment.updateMany({
    where: {
      taskId: { in: taskIds },
      status: 'active',
    },
    data: { status: 'pending_delete' },
  });

  // Eliminar los que ya estaban en pending_delete hace mas de 2 dias
  const cutoff2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const deleted = await db.taskAttachment.deleteMany({
    where: {
      status: 'pending_delete',
      createdAt: { lt: cutoff2 },
    },
  });

  console.log(`[cleanup-task-files] marked: ${marked.count}, deleted: ${deleted.count}`);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    marked: marked.count,
    deleted: deleted.count,
  });
}
