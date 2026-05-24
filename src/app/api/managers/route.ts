import { NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns PROJECT_MANAGER users â€” accessible to ADMIN and PROJECT_MANAGER
export async function GET() {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { workspaceId, role } = result.ctx;

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const managers = await db.user.findMany({
      where: {
        role: 'PROJECT_MANAGER',
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ managers });

  } catch (error) {
    console.error('[managers GET]', error);

    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}