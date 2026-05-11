import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const activityInclude = {
  assignedUser: { select: { id: true, name: true, email: true, color: true, image: true } },
  createdBy:    { select: { id: true, name: true, email: true, color: true, image: true } },
  client:       { select: { id: true, name: true, company: true } },
} as const;

const taskUserInclude = {
  select: { id: true, name: true, email: true, color: true, image: true },
} as const;

// GET — returns portal data for the current CLIENT, or for any client (admin preview via ?clientId=)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId    = (session.user as { id: string }).id;
    const userEmail = session.user.email as string;
    const role      = session.user.role as string;

    const isManager = MANAGER_ROLES.includes(role);

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
          ? 'No se encontró el cliente especificado.'
          : 'Tu cuenta de cliente aún no ha sido configurada. Contacta a tu Project Manager.',
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

    return NextResponse.json({ client, activities, tasks });
  } catch (error) {
    console.error('[client-portal GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
