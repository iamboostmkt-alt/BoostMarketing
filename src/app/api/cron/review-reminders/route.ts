import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { emailLayout } from "@/lib/branding";
export const dynamic = "force-dynamic";

// F1 — Recordatorios de revisión pendiente
// Corre cada hora. Notifica al PM en:
//   - 5h sin revisar: primer recordatorio
//   - 24h sin revisar: sube prioridad a urgent + notificación urgente
//   - Cada 4h después de 24h: recordatorio hasta que revise

function horasDesde(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const branding = await getBranding();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boostmarketingboost.com";

  // Tareas en internal_review
  const tareas = await db.task.findMany({
    where: {
      status: "internal_review",
      deletedAt: null,
    },
    include: {
      client: {
        select: {
          assignedManagerId: true,
          assignedManager: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  let notificaciones = 0;

  for (const tarea of tareas) {
    const manager = tarea.client?.assignedManager;
    if (!manager?.email) continue;

    const horas = horasDesde(tarea.updatedAt);

    // Determinar si toca notificar
    // 5h: primer recordatorio (entre 5h y 6h)
    // 24h: urgente (entre 24h y 25h) — también sube prioridad
    // Cada 4h después de 24h: recordatorio (25h, 29h, 33h...)
    const esPrimero   = horas >= 5  && horas < 6;
    const esUrgente   = horas >= 24 && horas < 25;
    const esPeriodico = horas >= 25 && Math.floor((horas - 25) % 4) === 0 && (horas - 25) % 4 < 1;

    if (!esPrimero && !esUrgente && !esPeriodico) continue;

    // Subir prioridad a urgent después de 24h
    if (esUrgente && tarea.priority !== "urgent") {
      await db.task.update({
        where: { id: tarea.id },
        data:  { priority: "urgent" },
      });
    }

    const asunto = esUrgente || esPeriodico
      ? `🚨 Revisión urgente pendiente: ${tarea.title}`
      : `⏳ Tarea lista para tu revisión: ${tarea.title}`;

    const cuerpo = esUrgente || esPeriodico
      ? `La tarea <strong>${tarea.title}</strong> lleva <strong>${Math.floor(horas)} horas</strong> esperando tu aprobación. Por favor revísala a la brevedad.`
      : `El equipo marcó como completada la tarea <strong>${tarea.title}</strong>. Está esperando tu revisión y aprobación.`;

    const html = emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#fff">${asunto}</h2>
      <p style="color:#a0a0b0;margin:0 0 24px">${cuerpo}</p>
      <a href="${appUrl}/dashboard/tasks" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Revisar tarea
      </a>
    `, branding);

    // Email
    await sendMail(manager.email, asunto, html);

    // Notificación en app
    await db.notification.create({
      data: {
        userId:  manager.id,
        message: esUrgente || esPeriodico
          ? `🚨 Revisión urgente (${Math.floor(horas)}h): ${tarea.title}`
          : `⏳ Tarea lista para revisar: ${tarea.title}`,
        type:    "task",
        read:    false,
        link:    "/dashboard/tasks",
      },
    });

    notificaciones++;
  }

  return NextResponse.json({
    ok: true,
    tareasEnRevision: tareas.length,
    notificacionesEnviadas: notificaciones,
  });
}
