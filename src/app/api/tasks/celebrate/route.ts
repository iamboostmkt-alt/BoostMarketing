import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { sendMail, templateFelicitacion } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { taskId, parentCompleted, assigneeIds, pmId } = await req.json();
  if (!taskId) return NextResponse.json({ ok: true });

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId },
    select: { title: true, userId: true },
  });
  if (!task) return NextResponse.json({ ok: true });

  const branding = await getBranding();
  const resolvedPmId = pmId ?? task.userId;

  // Solo enviar felicitación final si el proyecto se completó
  if (!parentCompleted) return NextResponse.json({ ok: true });

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

  // Correo + notif al PM
  if (pm?.email && !pm.email.endsWith('@boostmkt.com')) {
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
        }}).then(() => undefined).catch(() => undefined)
      );
    }
  }

  // Correo + notif al team
  for (const u of teamUsers.filter(u => u.email && !u.email.endsWith('@boostmkt.com'))) {
    sends.push(sendMail(
      u.email!,
      `🏆 ¡Proyecto completado! ${task.title}`,
      templateFelicitacion(u.name ?? 'Equipo', task.title, true, branding, 'team')
    ));
  }
  for (const uid of teamIds) {
    sends.push(
      db.notification.create({ data: {
        userId: uid, workspaceId,
        message: `🏆 ¡Proyecto completado! El proyecto "${task.title}" fue aprobado. ¡Excelente trabajo, sigue así!`,
        type: 'task', read: false, link: '/dashboard/tasks',
      }}).then(() => undefined).catch(() => undefined)
    );
  }

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true });
}
