import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { sendChatBotMessage, buildMentions } from "@/lib/chat-bot";
import { sendMail, templateFelicitacion, templateCambioEstado } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  const actorId    = result.ctx.userId;
  const actorName  = result.ctx.name || 'PM';
  const _actorImg  = await db.user.findFirst({ where: { id: actorId }, select: { image: true } });
  const actorImage = _actorImg?.image ?? null;

  const { taskId, parentCompleted, assigneeIds, pmId } = await req.json();
  if (!taskId) return NextResponse.json({ ok: true });

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId },
    select: {
      title: true, userId: true, clientId: true,
      assignedUsers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      parentTask: { select: { id: true, title: true } },
    },
  });
  if (!task) return NextResponse.json({ ok: true });

  const branding = await getBranding();
  const resolvedPmId = pmId ?? task.userId;

  // Siempre notificar al equipo cuando se aprueba — parentCompleted solo afecta el mensaje

  // Obtener PM
  const pm = resolvedPmId ? await db.user.findUnique({
    where: { id: resolvedPmId },
    select: { email: true, name: true },
  }) : null;

  // Obtener team (asignados que no son el PM)
  const teamIds: string[] = (assigneeIds ?? []).filter((id: string) => id !== resolvedPmId);
  const teamUsers = teamIds.length > 0 ? await db.user.findMany({
    where: { id: { in: teamIds }, workspaceId },
    select: { email: true, name: true },
  }) : [];

  const sends: Promise<void>[] = [];

  // Correo + notif al PM — solo si proyecto completado
  if (parentCompleted && pm?.email && !pm.email.endsWith('@boostmkt.com')) {
    sends.push(sendMail(
      pm.email,
      `🏆 ¡Proyecto completado! ${task.title}`,
      templateFelicitacion(pm.name ?? 'PM', task.title, true, branding, 'pm')
    ));
    if (resolvedPmId) {
      sends.push(
        db.notification.create({ data: {
          userId: resolvedPmId, workspaceId,
          message: `🏆 ¡Proyecto completado! El proyecto "${task.title}" fue completado exitosamente. ¡Felicita a tu equipo!`,
          type: 'task', read: false, link: '/dashboard/tasks',
          actorId, actorName, actorImage,
        }}).then(() => undefined).catch(() => undefined)
      );
    }
  }

  // Correo al team — celebracion completa si proyecto done, simple si solo aprobacion
  for (const u of teamUsers.filter(u => u.email && !u.email.endsWith('@boostmkt.com'))) {
    if (parentCompleted) {
      sends.push(sendMail(
        u.email!,
        `🏆 ¡Proyecto completado! ${task.title}`,
        templateFelicitacion(u.name ?? 'Equipo', task.title, true, branding, 'team')
      ));
    } else {
      sends.push(sendMail(
        u.email!,
        `✅ Tarea aprobada: ${task.title}`,
        templateCambioEstado(task.title, 'internal_review', 'approved', branding, u.name ?? undefined)
      ));
    }
  }
  for (const uid of teamIds) {
    sends.push(
      db.notification.create({ data: {
        userId: uid, workspaceId,
          message: parentCompleted ? `🏆 ¡Proyecto completado! "${task.title}" fue aprobado. ¡Excelente trabajo!` : `⭐ Tu entrega fue aprobada: "${task.title}"`,
        type: 'task', read: false, link: '/dashboard/tasks',
        actorId, actorName, actorImage,
      }}).then(() => undefined).catch(() => undefined)
    );
  }

  await Promise.allSettled(sends);

  // Mensaje bot en chat con @menciones correctas
  // Solo team members (no PM/ADMIN) reciben la felicitación
  const flatAssignees = (task.assignedUsers ?? []).map((au: any) => au.user ?? au);
  const teamMembers   = flatAssignees.filter((u: any) =>
    !['ADMIN', 'PROJECT_MANAGER'].includes(u.role ?? '')
  );
  const mentions = buildMentions(teamMembers);

  let chatMsg: string;
  if (parentCompleted) {
    chatMsg = mentions
      ? `🏆 ¡Proyecto completado! ${mentions} — ¡Excelente trabajo en "${task.title}"!`
      : `🏆 ¡Proyecto completado! "${task.title}" fue aprobado exitosamente.`;
  } else if (teamMembers.length > 0) {
    chatMsg = `🎉 ¡Felicidades ${mentions}! Tu entrega fue aprobada ✅\n📌 ${task.title}`;
  } else {
    chatMsg = `✅ Tarea aprobada: "${task.title}"`;
  }

  sendChatBotMessage({
    workspaceId,
    message: chatMsg,
    clientId: task.clientId ?? null,
    assignedUserIds: teamMembers.map((u: any) => u.id),
    senderId: actorId,
    isInternal: false, // visible al cliente en su portal
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
