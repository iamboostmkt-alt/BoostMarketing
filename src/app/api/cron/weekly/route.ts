import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TASK_STATUS, APPOINTMENT_STATUS } from "@/lib/constants/status";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cron-secret") === secret ||
         req.headers.get("authorization") === `Bearer ${secret}`;
}

function getWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const haceUnaSemana = new Date(ahora); haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const weekLabel = getWeekLabel(ahora);
  const mesAnteriorLabel = `${inicioMesAnterior.getFullYear()}-${String(inicioMesAnterior.getMonth() + 1).padStart(2, "0")}`;
  const esInicioMes = ahora.getDate() <= 7;
  const results: Record<string, unknown> = { weekLabel, mesAnteriorLabel };

  const workspaces = await db.workspace.findMany({ select: { id: true } });

  for (const ws of workspaces) {
    // ─── Snapshot semanal de reuniones ──────────────────────────────────
    const reuniones = await db.appointment.findMany({
      where: { workspaceId: ws.id, date: { lt: haceUnaSemana }, status: { in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.COMPLETED] } },
      select: { id: true },
    });
    if (reuniones.length > 0) {
      await db.analyticsSnapshot.upsert({
        where: { workspaceId_period_type: { workspaceId: ws.id, period: weekLabel, type: "weekly_meetings" } },
        update: { data: { total: reuniones.length } },
        create: { workspaceId: ws.id, period: weekLabel, type: "weekly_meetings", data: { total: reuniones.length } },
      }).catch(() => {});
    }

    // ─── Eliminar reuniones viejas (no pending/confirmed) ───────────────
    await db.appointment.deleteMany({
      where: { workspaceId: ws.id, date: { lt: haceUnaSemana }, status: { notIn: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED] } },
    });

    // ─── Snapshot mensual de tareas (solo primera semana del mes) ───────
    if (esInicioMes) {
      const tareasCompletadas = await db.task.findMany({
        where: { workspaceId: ws.id, status: { in: [TASK_STATUS.COMPLETED, TASK_STATUS.APPROVED] }, updatedAt: { gte: inicioMesAnterior, lt: inicioMesActual }, archivedAt: null },
        select: { id: true, userId: true, clientId: true, createdAt: true, updatedAt: true },
      });

      if (tareasCompletadas.length > 0) {
        const byUser: Record<string, number> = {};
        const byClient: Record<string, number> = {};
        let totalDays = 0;
        for (const t of tareasCompletadas) {
          if (t.userId) byUser[t.userId] = (byUser[t.userId] || 0) + 1;
          if (t.clientId) byClient[t.clientId] = (byClient[t.clientId] || 0) + 1;
          totalDays += Math.round((t.updatedAt.getTime() - t.createdAt.getTime()) / 86400000);
        }
        await db.analyticsSnapshot.upsert({
          where: { workspaceId_period_type: { workspaceId: ws.id, period: mesAnteriorLabel, type: "monthly_tasks" } },
          update: { data: { completed: tareasCompletadas.length, byUser, byClient, avgDays: Math.round(totalDays / tareasCompletadas.length) } },
          create: { workspaceId: ws.id, period: mesAnteriorLabel, type: "monthly_tasks", data: { completed: tareasCompletadas.length, byUser, byClient, avgDays: Math.round(totalDays / tareasCompletadas.length) } },
        }).catch(() => {});

        // Archivar tareas del mes anterior
        await db.task.updateMany({
          where: { id: { in: tareasCompletadas.map(t => t.id) } },
          data: { archivedAt: ahora },
        });
      }
    }
  }

  // ─── Cleanup leads sin convertir +7 días ───────────────────────────────
  const cutoffLeads = new Date(ahora); cutoffLeads.setDate(cutoffLeads.getDate() - 7);
  let totalLeadsDeleted = 0;
  for (const ws of workspaces) {
    const deleted = await db.contact.deleteMany({ where: { status: "lead", workspaceId: ws.id, createdAt: { lt: cutoffLeads } } });
    totalLeadsDeleted += deleted.count;
  }
  results.leadsDeleted = totalLeadsDeleted;

  return NextResponse.json({ ok: true, timestamp: ahora.toISOString(), ...results });
}
