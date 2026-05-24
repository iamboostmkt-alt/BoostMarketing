import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';

export async function GET(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await db.contact.deleteMany({
      where: {
        status:    'lead',
        workspaceId,
        createdAt: { lt: cutoff },
      },
    });

    const pending = await db.contact.count({
      where: { status: 'lead', workspaceId, createdAt: { gte: cutoff } },
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
