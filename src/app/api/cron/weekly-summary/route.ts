import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, templateResumenSemanal } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Vercel cron: cada lunes a las 8am
// vercel.json: { "path": "/api/cron/weekly-summary", "schedule": "0 8 * * 1" }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Obtener todos los usuarios con tareas activas
  const usuarios = await db.user.findMany({
    where: {
      assignedTasks: {
        some: {
          status: { notIn: ["completed", "cancelled"] },
          deletedAt: null,
        },
      },
    },
    include: {
      assignedTasks: {
        where: { deletedAt: null },
        orderBy: { dueDate: "asc" },
        take: 10,
      },
    },
  });

  let enviados = 0;

  for (const usuario of usuarios) {
    if (!usuario.email) continue;

    const tareas = usuario.assignedTasks;
    const pendientes   = tareas.filter(t => t.status === "pending").length;
    const enProgreso   = tareas.filter(t => t.status === "in_progress").length;
    const completadas  = tareas.filter(t => t.status === "completed").length;

    const tareasResumen = tareas.slice(0, 5).map(t => ({
      title:   t.title,
      status:  t.status ?? "pending",
      dueDate: t.dueDate
        ? new Date(t.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
        : undefined,
    }));

    await sendMail(
      usuario.email,
      "📊 Tu resumen semanal - BoostMarketing",
      templateResumenSemanal(
        usuario.name ?? "Usuario",
        pendientes,
        enProgreso,
        completadas,
        tareasResumen
      )
    );
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    usuariosNotificados: enviados,
  });
}
