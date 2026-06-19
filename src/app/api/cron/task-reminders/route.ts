import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/constants/status";
import { sendMail, templateRecordatorio, templateTareaVencida, templateEscalacionPM } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { sendChatBotMessage } from "@/lib/chat-bot";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cron-secret") === secret ||
         req.headers.get("authorization") === `Bearer ${secret}`;
}

// Verifica si la hora actual está dentro de una ventana de ±20 min de la hora objetivo
function inWindow(now: Date, targetHour: number, targetMin = 0): boolean {
  const target = new Date(now);
  target.setHours(targetHour, targetMin, 0, 0);
  return Math.abs(now.getTime() - target.getTime()) <= 20 * 60 * 1000;
}

function daysUntil(now: Date, due: Date): number {
  const diff = due.getTime() - now.getTime();
  return diff / (1000 * 60 * 60 * 24);
}

async function getAssignees(task: any): Promise<Array<{ id: string; email: string; name: string | null }>> {
  const users: Array<{ id: string; email: string; name: string | null }> = [];
  if (task.assignedUser?.email) users.push({ id: task.assignedUser.id, email: task.assignedUser.email, name: task.assignedUser.name });
  task.assignedUsers?.forEach((au: any) => {
    if (au.user?.email) users.push({ id: au.user.id, email: au.user.email, name: au.user.name });
  });
  return users.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
}

async function sendReminder(task: any, users: any[], flag: string, horasRestantes: number, branding: any) {
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : "";
  const results = await Promise.allSettled(
    users.filter(u => !u.email.endsWith("@boostmkt.com")).map(async (u) => {
      await db.notification.create({
        data: { userId: u.id, workspaceId: task.workspaceId, message: `⏰ Tu tarea "${task.title}" vence en ${horasRestantes}h`, type: "task", read: false, link: "/dashboard/tasks" },
      }).catch(() => {});
      await sendMail(u.email, `⏰ Recordatorio: ${task.title}`, templateRecordatorio(task.title, dueDate, horasRestantes, branding));
      // DM personal en chat — Weeklink bot avisa directamente
      const horaLabel = horasRestantes >= 24 ? `${Math.round(horasRestantes/24)} día(s)` : `${horasRestantes}h`;
      sendChatBotMessage({
        workspaceId: task.workspaceId,
        message: `⏰ **Recordatorio:** Tu tarea **"${task.title}"** vence en ${horaLabel}\n📅 Fecha límite: ${dueDate}`,
        clientId: task.clientId ?? null,
        assignedUserIds: [u.id],
        senderId: u.id,
        isInternal: true,
      }).catch(() => {});
    })
  );
  await db.task.update({ where: { id: task.id }, data: { [flag]: true, lastReminderAt: new Date() } });
  return results.length;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date();
  const branding = await getBranding();
  const results: Record<string, number> = { d3: 0, d2: 0, d1: 0, d0: 0, overdue: 0, escalated: 0 };

  const activeTasks = await db.task.findMany({
    where: {
      dueDate: { not: null },
      status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] },
      deletedAt: null,
      workspaceId: { not: undefined },
    },
    include: {
      assignedUser: { select: { id: true, email: true, name: true } },
      assignedUsers: { include: { user: { select: { id: true, email: true, name: true } } } },
      client: { select: { id: true, assignedManager: { select: { id: true, email: true, name: true } } } },
    },
  });

  for (const task of activeTasks) {
    const due = new Date(task.dueDate!);
    const days = daysUntil(now, due);
    const users = await getAssignees(task);
    // Asignar clientId para routing del chat
    (task as any).clientId = (task as any).client?.id ?? null;
    const dueStr = due.toLocaleDateString("es-MX");

    // ── 3 días antes → 10am ──────────────────────────────────────
    if (days >= 2.5 && days < 3.5 && !task.reminder3dSent && inWindow(now, 10)) {
      results.d3 += await sendReminder(task, users, "reminder3dSent", 72, branding);
    }

    // ── 2 días antes → 9am, 3pm, 9pm ────────────────────────────
    if (days >= 1.5 && days < 2.5) {
      if (!task.reminder2d1Sent && inWindow(now, 9))  results.d2 += await sendReminder(task, users, "reminder2d1Sent", 48, branding);
      if (!task.reminder2d2Sent && inWindow(now, 15)) results.d2 += await sendReminder(task, users, "reminder2d2Sent", 42, branding);
      if (!task.reminder2d3Sent && inWindow(now, 21)) results.d2 += await sendReminder(task, users, "reminder2d3Sent", 36, branding);
    }

    // ── 1 día antes → 8am, 2pm, 6pm, 10pm ──────────────────────
    if (days >= 0.5 && days < 1.5) {
      if (!task.reminder1d1Sent && inWindow(now, 8))  results.d1 += await sendReminder(task, users, "reminder1d1Sent", 24, branding);
      if (!task.reminder1d2Sent && inWindow(now, 14)) results.d1 += await sendReminder(task, users, "reminder1d2Sent", 18, branding);
      if (!task.reminder1d3Sent && inWindow(now, 18)) results.d1 += await sendReminder(task, users, "reminder1d3Sent", 14, branding);
      if (!task.reminder1d4Sent && inWindow(now, 22)) results.d1 += await sendReminder(task, users, "reminder1d4Sent", 10, branding);
    }

    // ── Día de vencimiento → 8am, 12pm, 4pm, 8pm ────────────────
    if (days >= 0 && days < 0.5) {
      if (!task.reminderD1Sent && inWindow(now, 8))  results.d0 += await sendReminder(task, users, "reminderD1Sent", 12, branding);
      if (!task.reminderD2Sent && inWindow(now, 12)) results.d0 += await sendReminder(task, users, "reminderD2Sent", 8, branding);
      if (!task.reminderD3Sent && inWindow(now, 16)) results.d0 += await sendReminder(task, users, "reminderD3Sent", 4, branding);
      if (!task.reminderD4Sent && inWindow(now, 20)) results.d0 += await sendReminder(task, users, "reminderD4Sent", 1, branding);
    }

    // ── Vencida: hasta 4 correos cada 4h, luego escala a PM ─────
    if (days < 0) {
      const lastReminder = task.lastReminderAt ? new Date(task.lastReminderAt) : null;
      const hoursSinceLast = lastReminder ? (now.getTime() - lastReminder.getTime()) / 3600000 : 999;

      if (!task.overdueEscalated && task.overdueCount < 4 && hoursSinceLast >= 4) {
        const eligibleUsers = users.filter(u => !u.email.endsWith("@boostmkt.com"));
        // Notificaciones y correos por usuario
        for (const u of eligibleUsers) {
          await db.notification.create({
            data: { userId: u.id, workspaceId: task.workspaceId, message: `🚨 Tu tarea "${task.title}" está vencida`, type: "task", read: false, link: "/dashboard/tasks" },
          }).catch(() => {});
          await sendMail(u.email, `🚨 Tarea vencida: ${task.title}`, templateTareaVencida(task.title, dueStr, branding, u.name ?? undefined));
        }
        // UN SOLO mensaje al chat con todos los asignados — evita duplicados
        if (eligibleUsers.length > 0) {
          sendChatBotMessage({
            workspaceId: task.workspaceId,
            message: `🚨 **Tarea vencida:** **"${task.title}"**\n📅 Venció el ${dueStr} — por favor complétala o actualiza su estado`,
            clientId: task.clientId ?? null,
            assignedUserIds: eligibleUsers.map(u => u.id),
            senderId: eligibleUsers[0].id,
            isInternal: true,
          }).catch(() => {});
        }
        await db.task.update({ where: { id: task.id }, data: { overdueCount: { increment: 1 }, lastReminderAt: now } });
        results.overdue++;
      }

      // Escalar al PM después de 4 intentos
      if (!task.overdueEscalated && task.overdueCount >= 4) {
        const pm = task.client?.assignedManager;
        if (pm?.email && !pm.email.endsWith("@boostmkt.com")) {
          const assigneeNames = users.map(u => u.name ?? u.email).join(", ");
          await db.notification.create({
            data: { userId: pm.id, workspaceId: task.workspaceId, message: `⚠️ ${assigneeNames} no ha completado: "${task.title}"`, type: "task", read: false, link: "/dashboard/tasks" },
          }).catch(() => {});
          await sendMail(
            pm.email,
            `⚠️ ${assigneeNames} no ha completado: ${task.title}`,
            templateEscalacionPM(pm.name ?? "PM", assigneeNames, task.title, dueStr, task.overdueCount, branding)
          );
          // Mensaje en canal TEAM alertando al PM
          sendChatBotMessage({
            workspaceId: task.workspaceId,
            message: `⚠️ **Escalación:** ${assigneeNames} lleva ${task.overdueCount} días sin completar **"${task.title}"** (vencida el ${dueStr})`,
            clientId: task.clientId ?? null,
            assignedUserIds: [pm.id],
            senderId: pm.id,
            isInternal: true,
          }).catch(() => {});
          results.escalated++;
        }
        await db.task.update({ where: { id: task.id }, data: { overdueEscalated: true } });
      }
    }
  }

  // ── Notificación diaria al PM de tareas pendientes de su equipo (10am) ──
  if (inWindow(now, 10)) {
    const pms = await db.user.findMany({
      where: { role: { in: ["PROJECT_MANAGER", "ADMIN"] } },
      select: { id: true, email: true, name: true, workspaceId: true },
    });
    for (const pm of pms) {
      if (!pm.email || pm.email.endsWith("@boostmkt.com")) continue;
      const pendingCount = await db.task.count({
        where: {
          workspaceId: pm.workspaceId,
          status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, TASK_STATUS.APPROVED] },
          deletedAt: null,
          client: { assignedManagerId: pm.id },
        },
      });
      if (pendingCount > 0) {
        await db.notification.create({
          data: { userId: pm.id, workspaceId: pm.workspaceId, message: `📋 Tienes ${pendingCount} tareas pendientes en tu equipo`, type: "task", read: false, link: "/dashboard/tasks" },
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), ...results });
}
