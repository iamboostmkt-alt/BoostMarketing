import { NextRequest, NextResponse } from 'next/server';
import { MANAGER_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { normalizeTaskStatus } from '@/lib/task-status';
import { AccessControl } from '@/core/access/access-control';



const taskUserInclude = {
  select: { id: true, name: true, email: true, color: true, image: true, role: true },
} as const;

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const user = { ...result.ctx, id: result.ctx.userId };
    const workspaceId = result.ctx.workspaceId;

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = user.id;
    const userEmail = user.email;
    const role      = user.role;
    const isManager = hasRole(role, MANAGER_ROLES);
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

      client = await db.client.findFirst({
        where: { id: clientId, workspaceId },
        include: {
          assignedManager: { select: { id: true, name: true, email: true, color: true, image: true } },
          assignedUsers: {
            include: {
              user: { select: { id: true, name: true, email: true, color: true, image: true, role: true } },
            },
          },
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
          assignedUsers: {
            include: {
              user: { select: { id: true, name: true, email: true, color: true, image: true, role: true } },
            },
          },
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
      where: { clientId: client.id, deletedAt: null, archivedAt: null, isDeliverable: true, NOT: { title: { startsWith: '[Cambio solicitado]' } } },
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
          workspaceId,
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
        OR: [
          { clientId: client.id },
          { email: { equals: client.email, mode: 'insensitive' } },
        ],
        date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
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
