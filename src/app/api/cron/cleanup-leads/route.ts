import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await db.contact.deleteMany({
      where: {
        status:    'lead',
        ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}),
        createdAt: { lt: cutoff },
      },
    });

    const pending = await db.contact.count({
      where: { status: 'lead', createdAt: { gte: cutoff } },
    });

    return NextResponse.json({
      message: `${deleted.count} leads eliminados. ${pending} pendientes activos.`,
      deleted: deleted.count,
      pending,
    });
  } catch (error) {
    console.error('[cleanup-leads]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
