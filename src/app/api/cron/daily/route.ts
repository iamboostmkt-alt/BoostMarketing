import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TASK_STATUS, APPOINTMENT_STATUS } from "@/lib/constants/status";
import {
  sendMail,
  templateTareaVencida,
  templateRecordatorio,
  templateRecordatorioVideollamada,
} from "@/lib/mailer";
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
    where: { dueDate: { gte: ahora, lte: manana }, status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] }, priority: { not: "urgent" }, deletedAt: null, workspaceId: { not: undefined } },
    data: { priority: "urgent" },
  });
  const highCount = await db.task.updateMany({
    where: { dueDate: { gt: manana, lte: pasadoManana }, status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] }, priority: { notIn: ["urgent","high"] }, deletedAt: null, workspaceId: { not: undefined } },
    data: { priority: "high" },
  });
  results.priorityUpdates = { urgent: urgentCount.count, high: highCount.count };

  // ─── 2. Notificar tareas vencidas ────────────────────────────────────────
  const tareasVencidas = await db.task.findMany({
    where: { dueDate: { lt: ahora }, status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] }, deletedAt: null, workspaceId: { not: undefined } },
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
      await db.notification.create({ data: { userId: u.id, workspaceId: t.workspaceId, message: `Tu tarea "${t.title}" está vencida`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
      // Filtrar dominios sin MX
      if (!u.email.endsWith('@boostmkt.com')) {
        await sendMail(u.email, `Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding, u.name ?? undefined));
        emailsEnviados++;
      }
    }
    const pm = t.client?.assignedManager;
    if (pm?.id && !uniqueUsers.find(u => u.id === pm.id)) {
      await db.notification.create({ data: { userId: pm.id, workspaceId: t.workspaceId, message: `Tarea vencida en tu cliente: "${t.title}"`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
    }
  }
  results.overdueNotified = emailsEnviados;

  // ─── 2b. Recordatorio reuniones próximas 24h ─────────────────────────────
  const mananaFin = new Date(ahora); mananaFin.setDate(mananaFin.getDate() + 1); mananaFin.setHours(23, 59, 59, 999);
  const reunionesManana = await db.activity.findMany({
    where: { startDate: { gte: manana, lte: mananaFin }, workspaceId: { not: undefined } },
    include: {
      assignedUser: { select: { id: true, email: true, name: true } },
      assignedUsers: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  let meetingReminders = 0;
  for (const m of reunionesManana) {
    const dateStr = new Date(m.startDate).toLocaleString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const musers: Array<{ id: string; email: string; name: string | null }> = [];
    if (m.assignedUser?.email) musers.push({ id: m.assignedUser.id, email: m.assignedUser.email, name: m.assignedUser.name });
    m.assignedUsers?.forEach((au: any) => { if (au.user?.email) musers.push({ id: au.user.id, email: au.user.email, name: au.user.name }); });
    const uniqueMusers = musers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
    for (const u of uniqueMusers) {
      if (u.email.endsWith("@boostmkt.com")) continue;
      await db.notification.create({ data: { userId: u.id, workspaceId: m.workspaceId, message: `Recordatorio: "${m.title}" mañana`, type: "meeting", read: false, link: "/dashboard/calendar" } }).catch(() => {});
      await sendMail(u.email, `⏰ Recordatorio de reunión mañana: ${m.title}`, templateRecordatorioVideollamada({ name: u.name ?? "equipo", dateStr, meetUrl: "", minutesBefore: 1440 }, branding));
      meetingReminders++;
    }
  }
  results.meetingReminders = meetingReminders;

  // ─── 2c. Recordatorio tareas que vencen mañana ───────────────────────────
  const tareasManana = await db.task.findMany({
    where: { dueDate: { gte: ahora, lte: manana }, status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] }, deletedAt: null, workspaceId: { not: undefined } },
    include: { assignedUser: { select: { id: true, email: true, name: true } }, assignedUsers: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });
  let taskRemindersCount = 0;
  for (const t of tareasManana) {
    const tusers: Array<{ id: string; email: string; name: string | null }> = [];
    if (t.assignedUser?.email) tusers.push({ id: t.assignedUser.id, email: t.assignedUser.email, name: t.assignedUser.name });
    t.assignedUsers?.forEach((au: any) => { if (au.user?.email) tusers.push({ id: au.user.id, email: au.user.email, name: au.user.name }); });
    const uniqueTUsers = tusers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX") : "";
    const horasRestantes = t.dueDate ? Math.round((new Date(t.dueDate).getTime() - ahora.getTime()) / 3600000) : 24;
    for (const u of uniqueTUsers) {
      if (u.email.endsWith("@boostmkt.com")) continue;
      await db.notification.create({ data: { userId: u.id, workspaceId: t.workspaceId, message: `Tu tarea "${t.title}" vence mañana`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
      await sendMail(u.email, `⏰ Tu tarea vence pronto: ${t.title}`, templateRecordatorio(t.title, dueDate, horasRestantes, branding));
      taskRemindersCount++;
    }
  }
  results.taskReminders = taskRemindersCount;

  // ─── 3. Recordatorios F1 (internal_review sin revisar) ───────────────────
  const hace5h  = new Date(ahora.getTime() - 5 * 3600000);
  const hace23h = new Date(ahora.getTime() - 23 * 3600000);
  const hace24h = new Date(ahora.getTime() - 24 * 3600000);
  const hace47h = new Date(ahora.getTime() - 47 * 3600000);
  const hace48h = new Date(ahora.getTime() - 48 * 3600000);

  const pendingReview = await db.task.findMany({
    where: { status: TASK_STATUS.INTERNAL_REVIEW, updatedAt: { lt: hace5h }, workspaceId: { not: undefined } },
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
    await db.notification.create({ data: { userId: pm.id, workspaceId: t.workspaceId, message: `"${t.title}" lleva ${urgencia}`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
    reviewReminders++;
  }
  results.reviewReminders = reviewReminders;

  // ─── 4. Cleanup citas canceladas/pasadas (+30 días) ──────────────────────
  const cutoff30 = new Date(ahora); cutoff30.setDate(cutoff30.getDate() - 30);
  const deletedAppts = await db.appointment.deleteMany({
    where: { OR: [{ status: APPOINTMENT_STATUS.CANCELLED, date: { lt: cutoff30 } }, { status: APPOINTMENT_STATUS.PENDING, date: { lt: cutoff30 } }] },
  });
  results.deletedAppointments = deletedAppts.count;

  // ─── 5. Soft-delete tareas completadas hace +7 días ──────────────────────
  const cutoff7 = new Date(ahora); cutoff7.setDate(cutoff7.getDate() - 7);
  const softDeleted = await db.task.updateMany({
    where: { status: TASK_STATUS.COMPLETED, deletedAt: null, updatedAt: { lt: cutoff7 }, workspaceId: { not: undefined } },
    data: { deletedAt: ahora },
  });
  results.softDeletedTasks = softDeleted.count;


  // ─── 5b. Cleanup archivos de tareas completadas +15 días ───────────────────
  const cutoffFiles = new Date(ahora.getTime() - 15 * 24 * 60 * 60 * 1000);
  const doneTasks = await db.task.findMany({
    where: { status: { in: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] }, updatedAt: { lt: cutoffFiles }, workspaceId: { not: undefined } },
    select: { id: true },
  });
  if (doneTasks.length > 0) {
    const doneIds = doneTasks.map(t => t.id);
    const markedFiles = await db.taskAttachment.updateMany({ where: { taskId: { in: doneIds }, status: "active" }, data: { status: "pending_delete" } });
    const cutoffDelete = new Date(ahora.getTime() - 2 * 24 * 60 * 60 * 1000);
    const deletedFiles = await db.taskAttachment.deleteMany({ where: { status: "pending_delete", createdAt: { lt: cutoffDelete } } });
    results.fileCleanup = { marked: markedFiles.count, deleted: deletedFiles.count };
  } else { results.fileCleanup = { marked: 0, deleted: 0 }; }

  // ─── 6. Marcar presencias obsoletas como offline (+15 min sin heartbeat) ────
  const cutoffPresence = new Date(ahora.getTime() - 15 * 60 * 1000);
  const offlineCount = await db.userPresence.updateMany({
    where: { status: 'online', lastSeen: { lt: cutoffPresence } },
    data:  { status: 'offline' },
  });
  results.presenceCleanup = offlineCount.count;
  return NextResponse.json({ ok: true, timestamp: ahora.toISOString(), ...results });
}
