import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ users: [] });

    const assignments = await db.clientAssignedUser.findMany({
      where: { clientId },
      include: {
        user: {
          select: { id: true, name: true, email: true, color: true, image: true, role: true, active: true },
        },
      },
    });

    const users = assignments
      .map((a) => a.user)
      .filter((u) => u.active && u.role !== 'CLIENT' && u.role !== 'UNASSIGNED');

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[clients/team GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}