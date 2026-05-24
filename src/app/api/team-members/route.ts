import { NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

const INTERNAL_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING', 'SALES_REP'];

export async function GET() {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { role, workspaceId } = result.ctx;
    if (!INTERNAL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        role: { in: INTERNAL_ROLES as unknown as import('@prisma/client').Role[] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        image: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[team-members GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}