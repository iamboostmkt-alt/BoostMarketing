import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMail, templateNuevaTarea } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER"];

export async function POST(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;
  if (!MANAGER_ROLES.includes(result.ctx.role as string)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requerido" }, { status: 400 });

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignedUser:  { select: { email: true, name: true } },
      assignedUsers: { include: { user: { select: { email: true, name: true } } } },
    },
  });
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

  const branding = await getBranding();
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-MX") : undefined;

  const emails = new Set<string>();
  if (task.assignedUser?.email) emails.add(task.assignedUser.email);
  task.assignedUsers?.forEach((au: any) => { if (au.user?.email) emails.add(au.user.email); });

  if (emails.size === 0) {
    return NextResponse.json({ error: "La tarea no tiene usuarios asignados" }, { status: 400 });
  }

  let enviados = 0;
  for (const email of emails) {
    await sendMail(
      email,
      `📌 Recordatorio: ${task.title} - BoostMarketing`,
      templateNuevaTarea(task.title, task.description ?? "", dueDate, branding)
    );
    enviados++;
  }

  return NextResponse.json({ ok: true, enviados });
}
