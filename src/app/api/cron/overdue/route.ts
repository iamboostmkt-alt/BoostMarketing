import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { sendMail, templateTareaVencida } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const ahora = new Date();

  const tareasVencidas = await db.task.findMany({
    where: {
      dueDate:   { lt: ahora },
      status:    { notIn: ["completed", "cancelled"] },
      deletedAt: null,
    },
    include: {
      assignedUser:  { select: { id: true, email: true, name: true } },
      assignedUsers: { include: { user: { select: { id: true, email: true, name: true } } } },
      client: { select: { assignedManagerId: true, assignedManager: { select: { id: true, email: true, name: true } } } },
    },
  });

  const branding = await getBranding();

  // Agrupar emails a notificar por tarea
  const emailsPorTarea = new Map<string, Set<string>>();
  for (const t of tareasVencidas) {
    const emails = new Set<string>();
    if (t.assignedUser?.email) emails.add(t.assignedUser.email);
    t.assignedUsers?.forEach((au: any) => { if (au.user?.email) emails.add(au.user.email); });
    emailsPorTarea.set(t.id, emails);
  }

  // Notificar asignados
  let enviados = 0;
  for (const t of tareasVencidas) {
    const emails = emailsPorTarea.get(t.id) ?? new Set();
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX") : "";
    for (const email of emails) {
      await sendMail(email, `🚨 Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding));
      enviados++;
    }
  }

  // Notificar solo al PM asignado al cliente de cada tarea
  // Agrupar tareas vencidas por PM para enviar un solo resumen por PM
  const tareasPorPM = new Map<string, { manager: { id: string; email: string; name: string | null }; tareas: typeof tareasVencidas }>();

  for (const t of tareasVencidas) {
    const manager = t.client?.assignedManager;
    if (!manager?.email) continue;
    if (!tareasPorPM.has(manager.id)) {
      tareasPorPM.set(manager.id, { manager, tareas: [] });
    }
    tareasPorPM.get(manager.id)!.tareas.push(t);
  }

  for (const { manager, tareas } of tareasPorPM.values()) {
    const lista = tareas.slice(0, 5).map(t => {
      const d = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
      return `<li style="margin:4px 0;color:#e5e5e5">${t.title}${d ? ` <span style="color:#888">(venció ${d})</span>` : ""}</li>`;
    }).join("");
    const extra = tareas.length > 5 ? `<li style="color:#888">+${tareas.length - 5} más...</li>` : "";
    const html = `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#0b0b0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
      <div style="background:#ef4444;padding:24px 32px"><h1 style="margin:0;font-size:20px;color:#fff">BoostMarketing — Resumen tareas vencidas</h1></div>
      <div style="padding:32px">
        <p style="color:#a0a0b0;margin-top:0">Tienes <strong style="color:#ef4444">${tareas.length} tarea${tareas.length > 1 ? "s" : ""} vencida${tareas.length > 1 ? "s" : ""}</strong> en tus clientes:</p>
        <ul style="padding-left:20px;margin:16px 0">${lista}${extra}</ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://boostmarketingboost.com"}/dashboard/tasks" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver tareas</a>
      </div>
    </div>`;
    await sendEmail({ to: manager.email, subject: `🚨 ${tareas.length} tarea${tareas.length > 1 ? "s" : ""} vencida${tareas.length > 1 ? "s" : ""} - BoostMarketing`, html });
    enviados++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: ahora.toISOString(),
    tareasVencidas: tareasVencidas.length,
    emailsEnviados: enviados,
  });
}
