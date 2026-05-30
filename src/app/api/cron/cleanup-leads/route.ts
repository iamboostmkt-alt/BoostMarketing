import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('x-cron-secret') === secret ||
         req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const workspaces = await db.workspace.findMany({ select: { id: true } });
    let totalDeleted = 0;
    for (const { id: workspaceId } of workspaces) {
      const deleted = await db.contact.deleteMany({
        where: { status: 'lead', workspaceId, createdAt: { lt: cutoff } },
      });
      totalDeleted += deleted.count;
    }
    return NextResponse.json({ ok: true, deleted: totalDeleted });
  } catch (error) {
    console.error('[cleanup-leads]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
