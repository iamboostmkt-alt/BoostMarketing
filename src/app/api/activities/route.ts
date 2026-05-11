import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchEvent } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';
import { log } from '@/lib/logger';

const MANAGE_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const userSelect = { id: true, name: true, email: true, color: true, image: true };

const includeRelations = {
  assignedUser:  { select: userSelect },
  createdBy:     { select: userSelect },
  client:        { select: { id: true, name: true, company: true } },
  assignedUsers: {
    select: {
      user: { select: userSelect },
    },
  },
};

/** Flatten assignedUsers join-table rows to plain user array */
function flatAssignees(raw: { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[]) {
  return raw.map((r) => r.user);
}

/** Sync ActivityAssignedUser junction records */
async function syncAssignees(activityId: string, userIds: string[]) {
  await db.activityAssignedUser.deleteMany({ where: { activityId } });
  if (userIds.length === 0) return;
  await db.activityAssignedUser.createMany({
    data: userIds.map((userId) => ({ activityId, userId })),
    skipDuplicates: true,
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    const { searchParams } = new URL(req.url);
    const status   = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    const base: Record<string, unknown> = {};
    if (status)   base.status   = status;
    if (clientId) base.clientId = clientId;

    let where: Record<string, unknown>;

    if (role === 'CLIENT') {
      const clientRecord = await db.client.findFirst({
        where: { email: { equals: session.user.email as string, mode: 'insensitive' } },
        select: { id: true },
      });
      where = clientRecord ? { ...base, clientId: clientRecord.id } : { id: 'none' };
    } else if (MANAGE_ROLES.includes(role)) {
      where = base;
    } else {
      where = {
        ...base,
        OR: [
          { assignedUserId: userId },
          { createdByUserId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      };
    }

    const activities = await db.activity.findMany({
      where,
      include: includeRelations,
      orderBy: { startDate: 'asc' },
    });

    const shaped = activities.map((a) => ({
      ...a,
      assignedUsers: flatAssignees(a.assignedUsers),
    }));

    return NextResponse.json({ activities: shaped });
  } catch (err) {
    log.err('/api/activities GET', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    const body = await req.json();
    const {
      title, description, status, priority,
      startDate, endDate, clientId,
      assignedUserId,
      assignedUserIds,
    } = body;

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Título y fecha de inicio son requeridos.' }, { status: 400 });
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json({ error: 'Fecha de inicio no válida.' }, { status: 400 });
    }

    const parsedEnd = endDate ? new Date(endDate) : null;
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Fecha de fin no válida.' }, { status: 400 });
    }

    // Resolve primary assignee (legacy compat)
    const ids: string[] = Array.isArray(assignedUserIds) ? assignedUserIds : (assignedUserId ? [assignedUserId] : []);
    const resolvedAssignee = MANAGE_ROLES.includes(role)
      ? (ids[0] ?? userId)
      : userId;

    const activity = await db.activity.create({
      data: {
        title:           title.trim(),
        description:     (description ?? '').trim(),
        status:          status ?? 'pending',
        priority:        priority ?? 'medium',
        startDate:       parsedStart,
        endDate:         parsedEnd,
        assignedUserId:  resolvedAssignee,
        createdByUserId: userId,
        clientId:        clientId ?? null,
      },
      include: includeRelations,
    });

    const allIds = MANAGE_ROLES.includes(role) ? (ids.length > 0 ? ids : [userId]) : [userId];
    await syncAssignees(activity.id, allIds);

    broadcastRealtime('activity.created', {
      activity: { ...activity, assignedUsers: allIds.map((id) => ({ id, name: null, email: '', color: '#7c3aed', image: null })) },
    }).catch(() => undefined);

    // Notify each newly assigned user (except creator)
    for (const uid of allIds) {
      if (uid !== userId) {
        dispatchEvent({
          type:          'activity.assigned',
          actorId:       userId,
          actorName:     session.user.name,
          targetUserId:  uid,
          activityTitle: activity.title,
        }).catch(() => undefined);
      }
    }

    await db.activityLog.create({
      data: {
        userId,
        action:   'CREATE_ACTIVITY',
        entity:   'Activity',
        entityId: activity.id,
        details:  JSON.stringify({ title: activity.title }),
      },
    });

    // Re-fetch with assignedUsers populated
    const full = await db.activity.findUnique({ where: { id: activity.id }, include: includeRelations });
    const shaped = { ...full, assignedUsers: flatAssignees(full!.assignedUsers) };

    return NextResponse.json({ activity: shaped }, { status: 201 });
  } catch (err) {
    log.err('/api/activities POST', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

    const existing = await db.activity.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Actividad no encontrada.' }, { status: 404 });

    if (!MANAGE_ROLES.includes(role) && existing.createdByUserId !== userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (fields.title       !== undefined) data.title       = fields.title.trim();
    if (fields.description !== undefined) data.description = fields.description.trim();
    if (fields.status      !== undefined) data.status      = fields.status;
    if (fields.priority    !== undefined) data.priority    = fields.priority;
    if (fields.startDate   !== undefined) data.startDate   = new Date(fields.startDate);
    if (fields.endDate     !== undefined) data.endDate     = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.clientId    !== undefined) data.clientId    = fields.clientId ?? null;

    // Handle assignees (manager only)
    let newAssigneeIds: string[] | null = null;
    if (MANAGE_ROLES.includes(role)) {
      if (Array.isArray(fields.assignedUserIds)) {
        newAssigneeIds = fields.assignedUserIds as string[];
      } else if (fields.assignedUserId !== undefined) {
        newAssigneeIds = fields.assignedUserId ? [fields.assignedUserId as string] : [];
      }
      if (newAssigneeIds !== null) {
        data.assignedUserId = newAssigneeIds[0] ?? null;
      }
    }

    const activity = await db.activity.update({
      where: { id },
      data,
      include: includeRelations,
    });

    if (newAssigneeIds !== null) {
      await syncAssignees(id, newAssigneeIds);

      // Notify newly added assignees
      const previousIds = activity.assignedUsers.map((r) => r.user.id);
      for (const uid of newAssigneeIds) {
        if (!previousIds.includes(uid) && uid !== userId) {
          dispatchEvent({
            type:          'activity.assigned',
            actorId:       userId,
            actorName:     session.user.name,
            targetUserId:  uid,
            activityTitle: activity.title,
          }).catch(() => undefined);
        }
      }
    }

    const full = await db.activity.findUnique({ where: { id: activity.id }, include: includeRelations });
    const shaped = { ...full, assignedUsers: flatAssignees(full!.assignedUsers) };

    broadcastRealtime('activity.updated', { activity: shaped }).catch(() => undefined);

    await db.activityLog.create({
      data: {
        userId,
        action:   'UPDATE_ACTIVITY',
        entity:   'Activity',
        entityId: activity.id,
        details:  JSON.stringify(data),
      },
    });

    return NextResponse.json({ activity: shaped });
  } catch (err) {
    log.err('/api/activities PUT', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

    const existing = await db.activity.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Actividad no encontrada.' }, { status: 404 });

    if (!MANAGE_ROLES.includes(role) && existing.createdByUserId !== userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    await db.activity.delete({ where: { id } });

    broadcastRealtime('activity.deleted', { id }).catch(() => undefined);

    await db.activityLog.create({
      data: {
        userId,
        action:   'DELETE_ACTIVITY',
        entity:   'Activity',
        entityId: id,
        details:  JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ message: 'Actividad eliminada.' });
  } catch (err) {
    log.err('/api/activities DELETE', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
