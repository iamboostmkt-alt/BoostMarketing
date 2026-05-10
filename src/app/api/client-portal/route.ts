import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const activityInclude = {
  assignedUser: { select: { id: true, name: true, email: true, color: true } },
  createdBy:    { select: { id: true, name: true, email: true, color: true } },
  client:       { select: { id: true, name: true, company: true } },
} as const;

const taskUserInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

// GET — returns the full portal data for the current CLIENT user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userEmail = session.user.email as string;
    const role      = session.user.role as string;

    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Solo disponible para clientes' }, { status: 403 });
    }

    // Look up the Client record linked to this user's email
    const client = await db.client.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
      include: {
        assignedManager: { select: { id: true, name: true, email: true, color: true, image: true } },
      },
    });

    if (!client) {
      return NextResponse.json({
        client:     null,
        activities: [],
        tasks:      [],
        message:    'Tu cuenta de cliente aún no ha sido configurada. Contacta a tu Project Manager.',
      });
    }

    const [activities, tasks] = await Promise.all([
      db.activity.findMany({
        where:   { clientId: client.id },
        include: activityInclude,
        orderBy: { startDate: 'asc' },
      }),
      db.task.findMany({
        where: { clientId: client.id },
        include: {
          user:         taskUserInclude,
          assignedUser: taskUserInclude,
          client:       { select: { id: true, name: true, company: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Log portal access (non-blocking)
    db.activityLog.create({
      data: {
        userId,
        action:   'CLIENT_PORTAL_VIEW',
        entity:   'Client',
        entityId: client.id,
        details:  '{}',
      },
    }).catch(() => undefined);

    return NextResponse.json({ client, activities, tasks });
  } catch (error) {
    console.error('[client-portal GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
