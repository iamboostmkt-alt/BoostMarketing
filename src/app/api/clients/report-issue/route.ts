import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { broadcastRealtime } from '@/lib/realtime-server';

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 5, windowMs: 60_000, identifier: 'report-issue' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] as any });
  if (!result.ok) return result.response;
  const { userId, workspaceId, name: reporterName } = result.ctx;

  const { clientId, issue } = await req.json();
  if (!clientId || !issue) return NextResponse.json({ error: 'clientId e issue requeridos' }, { status: 400 });

  const client = await db.client.findFirst({ where: { id: clientId, workspaceId }, select: { name: true } });
  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  // Buscar todos los ADMINs del workspace
  const admins = await db.user.findMany({
    where: { workspaceId, role: 'ADMIN' },
    select: { id: true },
  });

  const message = `⚠️ Reporte de problema — cliente **${client.name}**: ${issue} (reportado por ${reporterName ?? 'PM'})`;

  // Notificación a cada ADMIN
  if (admins.length > 0) {
    await db.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        workspaceId,
        message,
        type: 'task',
        read: false,
        link: '/dashboard/clients',
      })),
      skipDuplicates: true,
    });
  }

  // Mensaje en canal TEAM (chat interno del equipo) como bot Weeklink
  await db.chatMessage.create({
    data: {
      userId,
      workspaceId,
      room: 'TEAM',
      message,
      isSystem: true,
      systemName: 'Weeklink',
      isInternal: true,
    },
  });

  // Broadcast RT para toasts en tiempo real
  broadcastRealtime('notification.new', { message }).catch(() => {});

  return NextResponse.json({ ok: true });
}
