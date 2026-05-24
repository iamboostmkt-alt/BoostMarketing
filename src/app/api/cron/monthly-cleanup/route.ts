import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const mesLabel = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  // Archivar tareas del mes ANTERIOR
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

  const workspaces = await db.workspace.findMany({ select: { id: true } });
  let archived = 0;
  let snapshots = 0;

  for (const ws of workspaces) {
    const tareasCompletadas = await db.task.findMany({
      where: {
        workspaceId: ws.id,
        status: { in: ["completed", "approved"] },
        updatedAt: { gte: inicioMesAnterior, lt: inicioMesActual },
        archivedAt: null,
      },
      select: {
        id: true, title: true, userId: true, clientId: true,
        createdAt: true, updatedAt: true, priority: true,
      },
    });

    if (tareasCompletadas.length === 0) continue;

    // Calcular métricas para snapshot
    const byUser: Record<string, number> = {};
    const byClient: Record<string, number> = {};
    let totalDays = 0;

    for (const t of tareasCompletadas) {
      if (t.userId) byUser[t.userId] = (byUser[t.userId] || 0) + 1;
      if (t.clientId) byClient[t.clientId] = (byClient[t.clientId] || 0) + 1;
      const days = Math.round((t.updatedAt.getTime() - t.createdAt.getTime()) / 86400000);
      totalDays += days;
    }

    const mesAnteriorLabel = `${inicioMesAnterior.getFullYear()}-${String(inicioMesAnterior.getMonth() + 1).padStart(2, '0')}`;

    await db.analyticsSnapshot.upsert({
      where: { workspaceId_period_type: { workspaceId: ws.id, period: mesAnteriorLabel, type: "monthly_tasks" } },
      update: {
        data: {
          completed: tareasCompletadas.length,
          byUser,
          byClient,
          avgDays: tareasCompletadas.length > 0 ? Math.round(totalDays / tareasCompletadas.length) : 0,
        },
      },
      create: {
        workspaceId: ws.id,
        period: mesAnteriorLabel,
        type: "monthly_tasks",
        data: {
          completed: tareasCompletadas.length,
          byUser,
          byClient,
          avgDays: tareasCompletadas.length > 0 ? Math.round(totalDays / tareasCompletadas.length) : 0,
        },
      },
    });
    snapshots++;

    // Archivar las tareas
    const ids = tareasCompletadas.map(t => t.id);
    await db.task.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: ahora },
    });
    archived += ids.length;
  }

  return NextResponse.json({ ok: true, mesLabel, archived, snapshots, timestamp: ahora.toISOString() });
}
