import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, taskReminderHtml } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora = new Date();
  const en48h = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://boostmarketingboost.com";

  const tareas = await db.task.findMany({
    where: {
      dueDate:  { gte: ahora, lte: en48h },
      status:   { notIn: ["completed", "cancelled"] },
      assignedUser: { isNot: null },
    },
    include: {
      assignedUser: { select: { id: true, email: true, name: true } },
    },
  });

  // Agrupar por usuario - 1 email por usuario con todas sus tareas
  const porUsuario = new Map<string, { email: string; name: string; tareas: typeof tareas }>();
  for (const t of tareas) {
    if (!t.assignedUser?.email) continue;
    const uid = t.assignedUser.id;
    if (!porUsuario.has(uid)) {
      porUsuario.set(uid, { email: t.assignedUser.email, name: t.assignedUser.name ?? "Usuario", tareas: [] });
    }
    porUsuario.get(uid)!.tareas.push(t);
  }

  let enviados = 0;
  for (const [, usuario] of porUsuario) {
    // Tomar la tarea mas urgente para el email
    const tarea = usuario.tareas[0];
    if (!tarea.dueDate) continue;
    const msRestantes = tarea.dueDate.getTime() - ahora.getTime();
    const horasRestantes = Math.round(msRestantes / (1000 * 60 * 60));
    const dueDateStr = tarea.dueDate.toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const extra = usuario.tareas.length > 1 ? ` (+${usuario.tareas.length - 1} mas por vencer)` : "";
    await sendEmail({
      to: usuario.email,
      subject: `⏰ ${usuario.tareas.length} tarea${usuario.tareas.length > 1 ? "s" : ""} por vencer - BoostMarketing`,
      html: taskReminderHtml({
        userName: usuario.name,
        taskTitle: tarea.title + extra,
        dueDate: dueDateStr,
        status: tarea.status ?? "pending",
        priority: tarea.priority ?? "medium",
        appUrl,
      }),
    });
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: ahora.toISOString(),
    tareasRevisadas: tareas.length,
    emailsEnviados: enviados,
  });
}