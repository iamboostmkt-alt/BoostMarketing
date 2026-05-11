import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchEvent } from '@/lib/events';
import { broadcastRealtime } from '@/lib/realtime-server';
import { log } from '@/lib/logger';

const MANAGE_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const includeRelations = {
  assignedUser: { select: { id: true, name: true, email: true, color: true, image: true } },
  createdBy:    { select: { id: true, name: true, email: true, color: true, image: true } },
  client:       { select: { id: true, name: true, company: true } },
};

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
      where = { ...base, OR: [{ assignedUserId: userId }, { createdByUserId: userId }] };
    }

    const activities = await db.activity.findMany({
      where,
      include: includeRelations,
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ activities });
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
    const { title, description, status, priority, startDate, endDate, assignedUserId, clientId } = body;

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

    const resolvedAssignee = MANAGE_ROLES.includes(role)
      ? (assignedUserId ?? userId)
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

    broadcastRealtime('activity.created', { activity }).catch(() => undefined);

    // Notify assignee if different from creator
    if (activity.assignedUserId && activity.assignedUserId !== userId) {
      dispatchEvent({
        type:          'activity.assigned',
        actorId:       userId,
        actorName:     session.user.name,
        targetUserId:  activity.assignedUserId,
        activityTitle: activity.title,
      }).catch(() => undefined);
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

    return NextResponse.json({ activity }, { status: 201 });
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
    if (fields.title       !== undefined) data.title          = fields.title.trim();
    if (fields.description !== undefined) data.description    = fields.description.trim();
    if (fields.status      !== undefined) data.status         = fields.status;
    if (fields.priority    !== undefined) data.priority       = fields.priority;
    if (fields.startDate   !== undefined) data.startDate      = new Date(fields.startDate);
    if (fields.endDate     !== undefined) data.endDate        = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.clientId    !== undefined) data.clientId       = fields.clientId ?? null;
    if (MANAGE_ROLES.includes(role) && fields.assignedUserId !== undefined) {
      data.assignedUserId = fields.assignedUserId ?? null;
    }

    const activity = await db.activity.update({
      where: { id },
      data,
      include: includeRelations,
    });

    broadcastRealtime('activity.updated', { activity }).catch(() => undefined);

    // Newly assigned → notify
    if (
      data.assignedUserId &&
      data.assignedUserId !== existing.assignedUserId &&
      data.assignedUserId !== userId
    ) {
      dispatchEvent({
        type:          'activity.assigned',
        actorId:       userId,
        actorName:     session.user.name,
        targetUserId:  data.assignedUserId as string,
        activityTitle: activity.title,
      }).catch(() => undefined);
    }

    await db.activityLog.create({
      data: {
        userId,
        action:   'UPDATE_ACTIVITY',
        entity:   'Activity',
        entityId: activity.id,
        details:  JSON.stringify(data),
      },
    });

    return NextResponse.json({ activity });
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
