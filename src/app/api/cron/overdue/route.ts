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
  const manana = new Date(ahora); manana.setDate(manana.getDate() + 1);
  const pasadoManana = new Date(ahora); pasadoManana.setDate(pasadoManana.getDate() + 2);

  // REGLA 1: Subir prioridad a urgent si vence hoy o manana
  await db.task.updateMany({
    where: {
      dueDate: { gte: ahora, lte: manana },
      status: { notIn: ["completed", "cancelled", "approved"] },
      priority: { not: "urgent" },
      deletedAt: null,
    },
    data: { priority: "urgent" },
  });

  // REGLA 2: Subir prioridad a high si vence en 2 dias
  await db.task.updateMany({
    where: {
      dueDate: { gt: manana, lte: pasadoManana },
      status: { notIn: ["completed", "cancelled", "approved"] },
      priority: { notIn: ["urgent", "high"] },
      deletedAt: null,
    },
    data: { priority: "high" },
  });

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

  // Agrupar emails + nombres por tarea
  const emailsPorTarea = new Map<string, Array<{ email: string; name: string | null }>>();
  for (const t of tareasVencidas) {
    const users: Array<{ email: string; name: string | null }> = [];
    if (t.assignedUser?.email) users.push({ email: t.assignedUser.email, name: t.assignedUser.name });
    t.assignedUsers?.forEach((au: any) => { if (au.user?.email) users.push({ email: au.user.email, name: au.user.name }); });
    // Dedup por email
    const seen = new Set<string>();
    emailsPorTarea.set(t.id, users.filter(u => seen.has(u.email) ? false : (seen.add(u.email), true)));
  }

  // Notificar asignados con nombre personalizado
  let enviados = 0;
  for (const t of tareasVencidas) {
    const users = emailsPorTarea.get(t.id) ?? [];
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX") : "";
    for (const u of users) {
      await sendMail(u.email, `🚨 Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding, u.name ?? undefined));
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
      return `<li style="margin:4px 0;color:#374151">${t.title}${d ? ` <span style="color:#6b7280">(venció ${d})</span>` : ""}</li>`;
    }).join("");
    const extra = tareas.length > 5 ? `<li style="color:#888">+${tareas.length - 5} más...</li>` : "";
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td bgcolor="#ef4444" style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">BoostMarketing — Tareas vencidas</h1>
        </td></tr>
        <tr><td style="padding:32px;background-color:#ffffff;color:#18181b;font-size:15px;line-height:1.6;">
          <p style="color:#6b7280;margin-top:0">Tienes <strong style="color:#ef4444">${tareas.length} tarea${tareas.length > 1 ? "s" : ""} vencida${tareas.length > 1 ? "s" : ""}</strong> en tus clientes:</p>
          <ul style="padding-left:20px;margin:16px 0;color:#374151">${lista}${extra}</ul>
          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://boostmarketingboost.com"}/dashboard/tasks" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver tareas</a>
          </div>
        </td></tr>
        <tr><td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">BoostMarketing &copy; ${new Date().getFullYear()} &middot; Mensaje automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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
