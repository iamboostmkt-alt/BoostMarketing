import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, templateTareaVencida } from "@/lib/mailer";
import { sendEmail } from "@/lib/resend";
import { getBranding } from "@/lib/branding";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cron-secret") === secret ||
         req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ahora = new Date();
  const manana = new Date(ahora); manana.setDate(manana.getDate() + 1);
  const pasadoManana = new Date(ahora); pasadoManana.setDate(pasadoManana.getDate() + 2);
  const results: Record<string, unknown> = {};

  // ─── 1. Subir prioridad tareas por vencer ────────────────────────────────
  const urgentCount = await db.task.updateMany({
    where: { dueDate: { gte: ahora, lte: manana }, status: { notIn: ["completed","cancelled","approved"] }, priority: { not: "urgent" }, deletedAt: null },
    data: { priority: "urgent" },
  });
  const highCount = await db.task.updateMany({
    where: { dueDate: { gt: manana, lte: pasadoManana }, status: { notIn: ["completed","cancelled","approved"] }, priority: { notIn: ["urgent","high"] }, deletedAt: null },
    data: { priority: "high" },
  });
  results.priorityUpdates = { urgent: urgentCount.count, high: highCount.count };

  // ─── 2. Notificar tareas vencidas ────────────────────────────────────────
  const tareasVencidas = await db.task.findMany({
    where: { dueDate: { lt: ahora }, status: { notIn: ["completed","cancelled","approved"] }, deletedAt: null },
    include: {
      assignedUser:  { select: { id: true, email: true, name: true } },
      assignedUsers: { include: { user: { select: { id: true, email: true, name: true } } } },
      client: { select: { assignedManagerId: true, assignedManager: { select: { id: true, email: true, name: true } } } },
    },
  });

  const branding = await getBranding();
  let emailsEnviados = 0;

  for (const t of tareasVencidas) {
    const users: Array<{ id: string; email: string; name: string | null }> = [];
    if (t.assignedUser?.email) users.push({ id: t.assignedUser.id, email: t.assignedUser.email, name: t.assignedUser.name });
    t.assignedUsers?.forEach((au: any) => { if (au.user?.email) users.push({ id: au.user.id, email: au.user.email, name: au.user.name }); });
    const uniqueUsers = users.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX") : "";

    for (const u of uniqueUsers) {
      await db.notification.create({ data: { userId: u.id, message: `Tu tarea "${t.title}" está vencida`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
      await sendMail(u.email, `Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding, u.name ?? undefined));
      emailsEnviados++;
    }
    const pm = t.client?.assignedManager;
    if (pm?.id && !uniqueUsers.find(u => u.id === pm.id)) {
      await db.notification.create({ data: { userId: pm.id, message: `Tarea vencida en tu cliente: "${t.title}"`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
    }
  }
  results.overdueNotified = emailsEnviados;

  // ─── 3. Recordatorios F1 (internal_review sin revisar) ───────────────────
  const hace5h  = new Date(ahora.getTime() - 5 * 3600000);
  const hace23h = new Date(ahora.getTime() - 23 * 3600000);
  const hace24h = new Date(ahora.getTime() - 24 * 3600000);
  const hace47h = new Date(ahora.getTime() - 47 * 3600000);
  const hace48h = new Date(ahora.getTime() - 48 * 3600000);

  const pendingReview = await db.task.findMany({
    where: { status: "internal_review", updatedAt: { lt: hace5h } },
    include: { client: { select: { assignedManager: { select: { id: true, email: true, name: true } } } } },
  });

  let reviewReminders = 0;
  for (const t of pendingReview) {
    const pm = t.client?.assignedManager;
    if (!pm) continue;
    const age = ahora.getTime() - new Date(t.updatedAt).getTime();
    let urgencia = "";
    if (age > 48 * 3600000) urgencia = "URGENTE (48h+)";
    else if (age > 24 * 3600000) {
      urgencia = "24h sin revisar";
      await db.task.update({ where: { id: t.id }, data: { priority: "urgent" } }).catch(() => {});
    } else urgencia = "pendiente de revisión";
    await db.notification.create({ data: { userId: pm.id, message: `"${t.title}" lleva ${urgencia}`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
    reviewReminders++;
  }
  results.reviewReminders = reviewReminders;

  // ─── 4. Cleanup citas canceladas/pasadas (+30 días) ──────────────────────
  const cutoff30 = new Date(ahora); cutoff30.setDate(cutoff30.getDate() - 30);
  const deletedAppts = await db.appointment.deleteMany({
    where: { OR: [{ status: "cancelled", date: { lt: cutoff30 } }, { status: "pending", date: { lt: cutoff30 } }] },
  });
  results.deletedAppointments = deletedAppts.count;

  // ─── 5. Soft-delete tareas completadas hace +7 días ──────────────────────
  const cutoff7 = new Date(ahora); cutoff7.setDate(cutoff7.getDate() - 7);
  const softDeleted = await db.task.updateMany({
    where: { status: "completed", deletedAt: null, updatedAt: { lt: cutoff7 } },
    data: { deletedAt: ahora },
  });
  results.softDeletedTasks = softDeleted.count;

  return NextResponse.json({ ok: true, timestamp: ahora.toISOString(), ...results });
}
