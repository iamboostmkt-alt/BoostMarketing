import type { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { INTERNAL_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';



export async function GET() {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { role, workspaceId } = result.ctx;
    if (!hasRole(role, INTERNAL_ROLES)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        workspaceId,
        role: { in: INTERNAL_ROLES as unknown as Role[] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        image: true,
        role: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[team-members GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}