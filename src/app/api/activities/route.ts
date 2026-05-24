import { NextRequest, NextResponse } from 'next/server';
import { MANAGER_ROLES_EXT as MANAGER_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';



export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId, workspaceId, role } = result.ctx;
    const isManager = hasRole(role, MANAGER_ROLES);
    const isClient  = role === "CLIENT";

    const activities = await db.activity.findMany({
      where: isManager ? { workspaceId } : isClient ? {
        OR: [
          { assignedUserId: userId },
          { assignedUsers: { some: { userId } } },
        ],
      } : {
        workspaceId,
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