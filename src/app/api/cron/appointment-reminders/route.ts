import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendMail, templateRecordatorioVideollamada } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { sendChatBotMessage } from '@/lib/chat-bot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const branding = await getBranding();
  let sent = 0;

  const windows = [
    { minutes: 1440, field: 'reminder24hSent' as const, label: '24h' },
    { minutes: 60,   field: 'reminder1hSent'  as const, label: '1h'  },
    { minutes: 15,   field: 'reminder15mSent' as const, label: '15m' },
  ];

  for (const window of windows) {
    const targetTime = new Date(now.getTime() + window.minutes * 60 * 1000);
    const from = new Date(targetTime.getTime() - 5 * 60 * 1000);
    const to   = new Date(targetTime.getTime() + 5 * 60 * 1000);

    const appointments = await db.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { notIn: ['cancelled', 'completed', 'no_show'] },
        isInternal: false,
        [window.field]: false,
      },
      include: {
        assignedUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        client: { select: { id: true } },
      },
    });

    for (const appt of appointments) {
      const dateStr = appt.date.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: appt.timezone || 'America/Mexico_City',
      });
      const meetUrl = appt.meetUrl || '';
      const minutesBefore = window.minutes;

      // Email al cliente
      await sendMail(
        appt.email,
        `⏰ Tu videollamada en ${window.label === '24h' ? '24 horas' : window.label === '1h' ? '1 hora' : '15 minutos'} - ${branding.brandName}`,
        templateRecordatorioVideollamada({ name: appt.name, dateStr, meetUrl, minutesBefore }, branding)
      ).catch(console.error);

      // Email a assignedUsers
      for (const au of appt.assignedUsers) {
        if (au.user.email && au.user.email !== appt.email) {
          await sendMail(
            au.user.email,
            `📹 Videollamada con ${appt.name} en ${window.label} - ${branding.brandName}`,
            templateRecordatorioVideollamada({ name: au.user.name || 'Equipo', dateStr, meetUrl, minutesBefore }, branding)
          ).catch(console.error);
        }
      }

      // Notificaciones internas
      if (appt.assignedUsers.length > 0) {
        await db.notification.createMany({
          data: appt.assignedUsers.map((au) => ({
            userId:  au.user.id,
            workspaceId: appt.workspaceId,
            message: `📹 Videollamada con ${appt.name} en ${window.label === '24h' ? '24 horas' : window.label === '1h' ? '1 hora' : '15 minutos'}`,
            type:    'appointment',
            link:    '/dashboard/calendar',
          })),
          skipDuplicates: true,
        });
      }

      // Mensaje bot en chat del cliente (solo en recordatorio 24h para no spamear)
      if (window.label === '24h') {
        const clientId = (appt as any).client?.id ?? appt.clientId ?? null;
        const assignedIds = appt.assignedUsers.map((au: any) => au.user.id);
        const timeLabel = appt.date.toLocaleDateString('es-MX', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: '2-digit', minute: '2-digit',
          timeZone: appt.timezone || 'America/Mexico_City',
        });
        const chatMsg = [
          `📅 **Recordatorio de reunión mañana**`,
          `📌 ${appt.name || appt.title || 'Reunión'}`,
          `🗓 ${timeLabel}`,
          appt.meetUrl ? `🔗 ${appt.meetUrl}` : null,
        ].filter(Boolean).join('\n');
        const senderId = assignedIds[0] ?? appt.workspaceId;
        sendChatBotMessage({
          workspaceId: appt.workspaceId,
          message: chatMsg,
          clientId,
          assignedUserIds: assignedIds,
          senderId,
          isInternal: true,
        }).catch(() => {});
      }

      // Marcar enviado
      await db.appointment.update({
        where: { id: appt.id },
        data: {
          [window.field]: true,
          lastReminderAt: now,
          reminderCount: { increment: 1 },
        },
      });

      sent++;
    }
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), sent });
}
