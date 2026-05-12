import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${cronSecret}`;
}

/**
 * Weekly soft-delete: completed tasks older than 7 days get deletedAt set.
 * Configure in vercel.json crons + set CRON_SECRET in production.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const result = await db.task.updateMany({
    where: {
      status:    'completed',
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    softDeletedCount: result.count,
    cutoff: cutoff.toISOString(),
  });
}
