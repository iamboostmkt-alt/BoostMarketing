import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

const INTERNAL_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'DESIGNER', 'MARKETING', 'SALES_REP'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const role = session.user.role as string;
    if (!INTERNAL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        role: { in: INTERNAL_ROLES },
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