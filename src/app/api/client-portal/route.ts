import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { normalizeTaskStatus } from '@/lib/task-status';
import { getSessionUser } from '@/core/auth/get-session-user';
import { AccessControl } from '@/core/access/access-control';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const taskUserInclude = {
  select: { id: true, name: true, email: true, color: true, image: true, role: true },
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = user.id;
    const userEmail = user.email;
    const role      = user.role;
    const isManager = MANAGER_ROLES.includes(role);
    const isClient  = role === 'CLIENT';

    if (role === 'UNASSIGNED') {
      return NextResponse.json(
        { error: 'Tu cuenta aún no tiene rol asignado. Espera a que un administrador te asigne acceso.' },
        { status: 403 }
      );
    }

    if (role !== 'CLIENT' && !isManager) {
      return NextResponse.json({ error: 'Solo disponible para clientes' }, { status: 403 });
    }

    let client;

    if (isManager) {
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

      // AccessControl reemplaza el check manual de PM asignado
      if (client && !AccessControl.canAccessClientPortal(user, clientId, client)) {
        return NextResponse.json({ error: 'No tienes acceso al portal de este cliente.' }, { status: 403 });
      }
    } else {
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
          ? 'No se encontró el cliente especificado.'
          : 'Tu cuenta de cliente aún no ha sido configurada. Contacta a tu Project Manager.',
      });
    }

    const rawTasks = await db.task.findMany({
      where: { clientId: client.id, deletedAt: null, isDeliverable: true },
      include: {
        user:          taskUserInclude,
        assignedUser:  taskUserInclude,
        assignedUsers: { include: { user: taskUserInclude } },
        client:        { select: { id: true, name: true, company: true, assignedManagerId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // AccessControl filtra visibilidad en lugar del spread condicional anterior
    const userForFilter = isClient
      ? { ...user, clientId: client.id }
      : user;

    const shapedTasks = rawTasks
      .map((t) => ({
        ...t,
        status:        normalizeTaskStatus(t.status),
        assignedUsers: t.assignedUsers.map((r) => r.user),
      }))
      .filter((t) => AccessControl.canViewTask(userForFilter, t));

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

    const appointments = await db.appointment.findMany({
      where: {
        email: { equals: client.email, mode: 'insensitive' },
        date:  { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'asc' },
      include: {
        assignedUsers: {
          include: { user: { select: { id: true, name: true, email: true, color: true, image: true } } },
        },
      },
    });

    return NextResponse.json({ client, activities, tasks: shapedTasks, appointments });
  } catch (error) {
    log.err('/api/client-portal GET', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
