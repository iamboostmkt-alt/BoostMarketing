import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const haceUnaSemana = new Date(ahora);
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  // Snapshot semanal de reuniones por workspace
  const workspaces = await db.workspace.findMany({ select: { id: true } });
  const weekLabel = getWeekLabel(ahora);
  let snapshots = 0;

  for (const ws of workspaces) {
    const reuniones = await db.appointment.findMany({
      where: {
        workspaceId: ws.id,
        date: { lt: haceUnaSemana },
        status: { in: ["confirmed", "completed"] },
      },
      select: { id: true, date: true },
    });

    if (reuniones.length > 0) {
      await db.analyticsSnapshot.upsert({
        where: { workspaceId_period_type: { workspaceId: ws.id, period: weekLabel, type: "weekly_meetings" } },
        update: { data: { total: reuniones.length, archivedAt: ahora.toISOString() } },
        create: {
          workspaceId: ws.id,
          period: weekLabel,
          type: "weekly_meetings",
          data: { total: reuniones.length, archivedAt: ahora.toISOString() },
        },
      });
      snapshots++;
    }

    // Eliminar reuniones de más de 7 días
    await db.appointment.deleteMany({
      where: {
        workspaceId: ws.id,
        date: { lt: haceUnaSemana },
        status: { notIn: ["pending", "confirmed"] },
      },
    });
  }

  return NextResponse.json({ ok: true, weekLabel, snapshots, timestamp: ahora.toISOString() });
}

function getWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
