import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId  = (session.user as any).id;
    const role    = session.user.role as string;
    const isManager = MANAGER_ROLES.includes(role);

    const activities = await db.activity.findMany({
      where: isManager ? {} : {
        OR: [
          { assignedUserId: userId },
          { createdByUserId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      },
      orderBy: { startDate: 'asc' },
      select: {
        id:              true,
        title:           true,
        description:     true,
        status:          true,
        priority:        true,
        startDate:       true,
        endDate:         true,
        assignedUserId:  true,
        createdByUserId: true,
        clientId:        true,
        createdAt:       true,
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('[api/activity] GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}