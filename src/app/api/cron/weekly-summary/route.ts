import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, templateResumenSemanal } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Guard: solo ejecutar los lunes UTC
  const hoy = new Date();
  if (hoy.getUTCDay() !== 1) {
    return NextResponse.json({ ok: false, skipped: true, reason: "No es lunes UTC", day: hoy.getUTCDay() });
  }

  const usuarios = await db.user.findMany({
    where: { assignedTasks: { some: { status: { notIn: ["completed", "cancelled"] }, deletedAt: null } } },
    include: { assignedTasks: { where: { deletedAt: null }, orderBy: { dueDate: "asc" }, take: 10 } },
  });

  const envios = usuarios.filter((u) => !!u.email).map((usuario) => {
    const tareas = usuario.assignedTasks;
    const pendientes  = tareas.filter((t) => t.status === "pending").length;
    const enProgreso  = tareas.filter((t) => t.status === "in_progress").length;
    const completadas = tareas.filter((t) => t.status === "completed").length;
    const tareasResumen = tareas.slice(0, 5).map((t) => ({
      title: t.title,
      status: t.status ?? "pending",
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : undefined,
    }));
    return sendMail(
      usuario.email!,
      "Resumen semanal - BoostMarketing",
      templateResumenSemanal(usuario.name ?? "Usuario", pendientes, enProgreso, completadas, tareasResumen)
    );
  });

  const timeoutPromise = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000));
  let enviados = 0;
  let errores = 0;
  try {
    const resultados = await Promise.race([Promise.allSettled(envios), timeoutPromise]) as PromiseSettledResult<void>[];
    enviados = resultados.filter((r) => r.status === "fulfilled").length;
    errores  = resultados.filter((r) => r.status === "rejected").length;
  } catch {
    return NextResponse.json({ ok: true, warning: "Timeout parcial", timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), usuariosNotificados: enviados, errores });
}