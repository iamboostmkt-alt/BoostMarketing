import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Vercel cron: ejecutar diariamente a las 03:00 UTC
// vercel.json: { "crons": [{ "path": "/api/cron/cleanup-appointments", "schedule": "0 3 * * *" }] }
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    // Eliminar citas canceladas o pasadas hace mas de 30 dias
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const deleted = await db.appointment.deleteMany({
      where: {
        OR: [
          { status: 'cancelled', date: { lt: cutoff } },
          { status: 'pending',   date: { lt: cutoff } },
        ],
      },
    });

    console.log('[cron/cleanup-appointments] Eliminadas:', deleted.count);
    return NextResponse.json({ deleted: deleted.count });
  } catch (error) {
    console.error('[cron/cleanup-appointments]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}