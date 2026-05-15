import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { normalizeTaskStatus } from '@/lib/task-status';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const taskUserInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

// GET Ã¢â‚¬â€ returns portal data for the current CLIENT, or for any client (admin preview via ?clientId=)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userEmail = session.user.email as string;
    const role      = session.user.role as string;

    const isManager = MANAGER_ROLES.includes(role);
    const isClient  = role === 'CLIENT';

    if (role === 'UNASSIGNED') {
      return NextResponse.json(
        { error: 'Tu cuenta aÃƒÂºn no tiene rol asignado. Espera a que un administrador te asigne acceso.' },
        { status: 403 }
      );
    }

    if (role !== 'CLIENT' && !isManager) {
      return NextResponse.json({ error: 'Solo disponible para clientes' }, { status: 403 });
    }

    let client;

    if (isManager) {
      // Admin preview: ?clientId=xxx required
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId');

      if (!clientId) {
        return NextResponse.json(
          { error: 'Especifica ?clientId= para previsualizar el portal de un cliente' },
          { status: 400 }
        );
      }

      client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          assignedManager: { select: { id: true, name: true, email: true, color: true, image: true } },
        },
      });
    } else {
      // CLIENT: find by their email
      client = await db.client.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' } },
        include: {
          assignedManager: { select: { id: true, name: true, email: true, color: true, image: true } },
        },
      });
    }

    if (!client) {
      return NextResponse.json({
        client:     null,
        activities: [],
        tasks:      [],
        message:    isManager
          ? 'No se encontrÃƒÂ³ el cliente especificado.'
          : 'Tu cuenta de cliente aÃƒÂºn no ha sido configurada. Contacta a tu Project Manager.',
      });
    }

    // Portal siempre muestra solo tareas visibles al cliente (nunca internas)
    // Cliente solo ve client_visible; managers ven todas
    const tasks = await db.task.findMany({
      where: { clientId: client.id, deletedAt: null, ...(isClient && { visibility: 'client_visible' }) },
      include: {
        user:         taskUserInclude,
        assignedUser: taskUserInclude,
        assignedUsers: {
          include: { user: taskUserInclude },
        },
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Log portal access (non-blocking, only for CLIENT self-views)
    if (role === 'CLIENT') {
      db.activityLog.create({
        data: {
          userId,
          action:   'CLIENT_PORTAL_VIEW',
          entity:   'Client',
          entityId: client.id,
          details:  '{}',
        },
      }).catch(() => undefined);
    }

    const shapedTasks = tasks.map((t) => ({
      ...t,
      status: normalizeTaskStatus(t.status),
      assignedUsers: t.assignedUsers.map((r) => r.user),
    }));

    // Fetch activities visibles al cliente
    const activities = await db.activity.findMany({
      where: {
        clientId: client.id,
        ...(isClient && { visibleToClient: true }),
      },
      include: {
        createdBy:    { select: { id: true, name: true, email: true, color: true, image: true } },
        assignedUser: { select: { id: true, name: true, email: true, color: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ client, activities, tasks: shapedTasks });
  } catch (error) {
    log.err('/api/client-portal GET', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
