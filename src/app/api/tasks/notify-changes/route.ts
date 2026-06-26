import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from '@/lib/db';
import { sendMail, templateCambiosPedidosPM } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'notify-changes' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { taskId, fileName, comment } = body;
  if (!taskId || !fileName || !comment)
    return NextResponse.json({ error: 'taskId, fileName y comment requeridos' }, { status: 400 });

  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId },
    include: {
      assignedUser: { select: { email: true, name: true } },
      assignedUsers: { include: { user: { select: { email: true, name: true } } } },
    },
  });
  if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

  const branding = await getBranding(workspaceId);
  const pmName = result.ctx.name || result.ctx.email || 'El PM';

  // Recopilar emails de asignados
  const recipients: { email: string; name: string }[] = [];
  if (task.assignedUser?.email) recipients.push({ email: task.assignedUser.email, name: task.assignedUser.name || '' });
  task.assignedUsers?.forEach((au: any) => {
    if (au.user?.email && !recipients.find(r => r.email === au.user.email))
      recipients.push({ email: au.user.email, name: au.user.name || '' });
  });

  // Enviar correo a cada asignado
  for (const r of recipients) {
    await sendMail(
      r.email,
      `✏️ Cambios solicitados en: ${task.title}`,
      templateCambiosPedidosPM(task.title, fileName, comment, r.name || r.email, pmName, branding)
    ).catch(() => {});
  }

  return NextResponse.json({ sent: recipients.length });
}
