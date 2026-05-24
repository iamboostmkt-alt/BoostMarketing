import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { AccessControl } from '@/core/access/access-control';
import { normalizeTaskStatus } from '@/lib/task-status';

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId: _userId, workspaceId, role } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    const { searchParams } = new URL(req.url);
    const scope    = searchParams.get('scope') || 'mine';
    const clientId = searchParams.get('clientId');

    const isAdmin   = user.role === 'ADMIN';
    const isPM      = user.role === 'PROJECT_MANAGER';
    const isManager = isAdmin || isPM;
    const isClient  = user.role === 'CLIENT';

    const userInclude = {
      select: { id: true, name: true, email: true, color: true, image: true },
    };

    // ── TASKS ──────────────────────────────────────────────
    // workspaceId ya disponible desde requireWorkspace
    let taskWhere: any = workspaceId ? { workspaceId } : {};

    if (isClient) {
      const clientRecord = await db.client.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: { id: true },
      });
      taskWhere = clientRecord
        ? { clientId: clientRecord.id, visibility: 'client_visible', deletedAt: null, parentTaskId: null }
        : { id: 'none' };
    } else if (scope === 'all' && isManager) {
      taskWhere = { deletedAt: null, archivedAt: null, parentTaskId: null };
    } else if (scope === 'clients-with-tasks' && isManager) {
      taskWhere = { clientId: { not: null }, deletedAt: null, archivedAt: null, parentTaskId: null };
    } else if (clientId && isManager) {
      taskWhere = { clientId, deletedAt: null, archivedAt: null, parentTaskId: null, NOT: { type: 'internal_task' } };
    } else {
      taskWhere = {
        deletedAt: null,
        archivedAt: null,
        parentTaskId: null,
        OR: [
          { userId: user.id },
          { assignedUserId: user.id },
          { assignedUsers: { some: { userId: user.id } } },
        ],
      };
    }

    const rawTasks = await db.task.findMany({
      where: taskWhere,
      include: {
        assignedUser:  userInclude,
        assignedUsers: { include: { user: userInclude } },
        client:        { select: { id: true, name: true, company: true, assignedManagerId: true } },
        subtasks:      { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tasks = rawTasks
      .map(t => ({
        ...t,
        status:        normalizeTaskStatus(t.status),
        assignedUsers: t.assignedUsers.map((au: any) => au.user ? au.user : au),
      }))
      .filter(t => AccessControl.canViewTask(user, t));

    // ── SUBTAREAS en calendario ────────────────────────────
    // Admin y PM ven todas las subtareas
    // Equipo ve solo sus subtareas asignadas
    let subtaskEvents: any[] = [];
    if (!isClient) {
      const subtaskWhere: any = isManager
        ? {
            parentTaskId: { not: null },
            archivedAt: null,
            OR: [{ dueDate: { not: null } }, { startDate: { not: null } }],
          }
        : {
            parentTaskId: { not: null },
            archivedAt: null,
            OR: [
              { userId: user.id },
              { assignedUserId: user.id },
              { assignedUsers: { some: { userId: user.id } } },
            ],
            AND: [{ OR: [{ dueDate: { not: null } }, { startDate: { not: null } }] }],
          };

      const rawSubtasks = await db.task.findMany({
        where: subtaskWhere,
        include: {
          assignedUser:  userInclude,
          assignedUsers: { include: { user: userInclude } },
          client:        { select: { id: true, name: true, company: true, assignedManagerId: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      subtaskEvents = rawSubtasks.map(t => ({
        ...t,
        // Si solo tiene startDate usar como dueDate y viceversa
        dueDate:       t.dueDate ?? t.startDate,
        startDate:     t.startDate ?? t.dueDate,
        status:        normalizeTaskStatus(t.status),
        assignedUsers: t.assignedUsers.map((au: any) => au.user ? au.user : au),
        isSubtask:     true,
      }));
    }

    // ── APPOINTMENTS ───────────────────────────────────────
    let appointments: any[] = [];
    let meetings: any[]     = [];

    if (!isClient) {
      const apptInclude = {
        assignedUsers: {
          include: { user: userInclude },
        },
      };

      if (isManager) {
        appointments = await db.appointment.findMany({
          where:   { NOT: { email: { endsWith: '@internal.boost' } } },
          include: apptInclude,
          orderBy: { date: 'asc' },
        });
        meetings = await db.appointment.findMany({
          where:   { email: { endsWith: '@internal.boost' } },
          include: apptInclude,
          orderBy: { date: 'asc' },
        });
      } else {
        // Team: solo donde está asignado
        appointments = await db.appointment.findMany({
          where: {
            NOT: { email: { endsWith: '@internal.boost' } },
            assignedUsers: { some: { userId: user.id } },
          },
          include: apptInclude,
          orderBy: { date: 'asc' },
        });
        meetings = await db.appointment.findMany({
          where: {
            email: { endsWith: '@internal.boost' },
            assignedUsers: { some: { userId: user.id } },
          },
          include: apptInclude,
          orderBy: { date: 'asc' },
        });
      }
    }

    // ── ACTIVITIES ─────────────────────────────────────────
    const activityWhere: any = isClient
      ? { visibleToClient: true }
      : isManager
        ? {}
        : { assignedUserId: user.id };

    const activities = await db.activity.findMany({
      where:   activityWhere,
      include: {
        createdBy:    userInclude,
        assignedUser: userInclude,
      },
      orderBy: { createdAt: 'desc' },
      take:    100,
    });

    // ── MILESTONES ─────────────────────────────────────────
    let milestones: any[] = [];
    if (!isClient && isManager) {
      milestones = await db.milestone.findMany({
        where: scope === 'all' ? {} : {
          client: {
            OR: [
              { assignedManagerId: user.id },
              { assignedUsers: { some: { userId: user.id } } },
            ],
          },
        },
        include: {
          client: { select: { id: true, name: true, company: true } },
          responsible: { select: { id: true, name: true, email: true, color: true } },
        },
        orderBy: { date: 'asc' },
      });
    }

    return NextResponse.json({ tasks: [...tasks, ...subtaskEvents], appointments, meetings, activities, milestones });
  } catch (error) {
    console.error('[calendar GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
