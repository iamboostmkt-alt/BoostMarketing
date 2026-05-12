import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, templateRecordatorio } from "@/lib/mailer";

// Llama a este endpoint con un cron externo (Vercel Cron, crontab, etc.)
// Ejemplo Vercel: vercel.json -> { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  // Seguridad: solo llamadas con el secret correcto
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora  = new Date();
  const en24h  = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  const en48h  = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

  // Tareas que vencen en las próximas 24h y no están completadas/canceladas
  const tareas = await db.task.findMany({
    where: {
      dueDate:  { gte: ahora, lte: en48h },
      status:   { notIn: ["completed", "cancelled"] },
      assignedUser: { isNot: null },
    },
    include: {
      assignedUser: { select: { email: true, name: true } },
    },
  });

  let enviados = 0;

  for (const tarea of tareas) {
    if (!tarea.assignedUser?.email || !tarea.dueDate) continue;

    const msRestantes   = tarea.dueDate.getTime() - ahora.getTime();
    const horasRestantes = Math.round(msRestantes / (1000 * 60 * 60));
    const dueDateStr     = tarea.dueDate.toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    await sendMail(
      tarea.assignedUser.email,
      `⏰ Recordatorio: "${tarea.title}" vence pronto`,
      templateRecordatorio(tarea.title, dueDateStr, horasRestantes)
    );
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: ahora.toISOString(),
    tareasRevisadas: tareas.length,
    emailsEnviados:  enviados,
  });
}
