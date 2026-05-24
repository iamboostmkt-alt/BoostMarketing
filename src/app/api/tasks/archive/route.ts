import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { MANAGER_ROLES } from '@/core/constants/roles';

// POST /api/tasks/archive — archivar tareas completadas de un cliente
// DELETE /api/tasks/archive?taskId=xxx — desarchivar una tarea específica

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    const { clientId, taskIds } = await req.json();

    // Si se pasan taskIds específicos, archivar esos
    // Si se pasa clientId, archivar todas las completadas/aprobadas del cliente
    let where: any = {
      archivedAt: null,
      workspaceId,
      status: { in: ['completed', 'approved'] },
      deliverableStatus: { in: ['completed', 'approved'] },
    };

    if (taskIds?.length > 0) {
      where = { id: { in: taskIds }, archivedAt: null, workspaceId };
    } else if (clientId) {
      where.clientId = clientId;
    } else {
      return NextResponse.json({ error: 'clientId o taskIds requerido' }, { status: 400 });
    }

    const archiveResult = await db.task.updateMany({
      where,
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ archived: archiveResult.count });
  } catch (error) {
    console.error('[tasks/archive POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const result2 = await requireWorkspace();
    if (!result2.ok) return result2.response;
    const user = { ...result2.ctx, id: result2.ctx.userId };
    if (!(MANAGER_ROLES as unknown as string[]).includes(user.role))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 });

    await db.task.update({
      where: { id: taskId },
      data: { archivedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tasks/archive DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// GET /api/tasks/archive?clientId=xxx — ver tareas archivadas de un cliente
export async function GET(req: NextRequest) {
  try {
    const result2 = await requireWorkspace();
    if (!result2.ok) return result2.response;
    const user = { ...result2.ctx, id: result2.ctx.userId };
    if (!(MANAGER_ROLES as unknown as string[]).includes(user.role))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const clientId = req.nextUrl.searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });

    const tasks = await db.task.findMany({
      where: {
        clientId,
        archivedAt: { not: null },
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true, color: true, image: true } },
        assignedUsers: { include: { user: { select: { id: true, name: true, email: true, color: true, image: true } } } },
      },
      orderBy: { archivedAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[tasks/archive GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
