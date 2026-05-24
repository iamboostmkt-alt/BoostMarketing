import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'];

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId, role } = result.ctx;
    const isManager = MANAGER_ROLES.includes(role);
    const isClient  = role === "CLIENT";

    const activities = await db.activity.findMany({
      where: isManager ? {} : isClient ? {
        OR: [
          { assignedUserId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      } : {
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