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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { count } = await db.aiSession.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });

  return NextResponse.json({ ok: true, deleted: count, cutoff });
}
