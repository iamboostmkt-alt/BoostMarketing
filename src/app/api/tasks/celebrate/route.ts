import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { sendMail, templateFelicitacion } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { taskId, parentCompleted, assigneeIds } = await req.json();
  if (!taskId || !assigneeIds?.length) return NextResponse.json({ ok: true });

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId },
    select: { title: true },
  });
  if (!task) return NextResponse.json({ ok: true });

  const branding = await getBranding();
  const users = await db.user.findMany({
    where: { id: { in: assigneeIds }, workspaceId },
    select: { email: true, name: true },
  });

  await Promise.allSettled(
    users
      .filter(u => u.email && !u.email.endsWith('@boostmkt.com'))
      .map(u => sendMail(
        u.email!,
        parentCompleted ? `🏆 ¡Proyecto completado! ${task.title}` : `⭐ Entrega aprobada: ${task.title}`,
        templateFelicitacion(u.name ?? 'Equipo', task.title, parentCompleted ?? false, branding)
      ))
  );

  return NextResponse.json({ ok: true });
}
