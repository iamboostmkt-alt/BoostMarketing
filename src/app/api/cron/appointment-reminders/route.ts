import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

function reminderEmailHtml(params: {
  name: string;
  dateStr: string;
  meetUrl: string;
  minutesBefore: number;
}) {
  const { name, dateStr, meetUrl, minutesBefore } = params;
  const label = minutesBefore >= 1440 ? '24 horas' : minutesBefore >= 60 ? '1 hora' : '15 minutos';
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">📹</div>
        <h1 style="margin:0;font-size:22px;">Recordatorio de Videollamada</h1>
        <p style="margin:8px 0 0;opacity:0.85;">Tu reunión comienza en <strong>${label}</strong></p>
      </div>
      <div style="padding:32px;">
        <p style="color:#ccc;margin:0 0 8px;">Hola <strong style="color:#fff;">${name}</strong>,</p>
        <p style="color:#ccc;">Tu videollamada con BoostMarketing está programada para:</p>
        <div style="background:#1a1a2e;border:1px solid #7c3aed44;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#a78bfa;">${dateStr}</p>
        </div>
        ${meetUrl ? `<div style="text-align:center;margin:24px 0;">
          <a href="${meetUrl}" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">🔗 Unirse a la reunión</a>
        </div>` : ''}
        <p style="color:#666;font-size:13px;margin-top:24px;">Si tienes alguna pregunta, responde a este correo.</p>
      </div>
    </div>`;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;

  // Ventana ±5 minutos para cada reminder
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
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    for (const appt of appointments) {
      const dateStr = appt.date.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: appt.timezone || 'America/Mexico_City',
      });
      const meetUrl = appt.meetUrl || '';
      const html = reminderEmailHtml({ name: appt.name, dateStr, meetUrl, minutesBefore: window.minutes });

      // Email al cliente
      await sendMail(
        appt.email,
        `⏰ Recordatorio: Tu videollamada en ${window.label === '24h' ? '24 horas' : window.label === '1h' ? '1 hora' : '15 minutos'}`,
        html
      ).catch(console.error);

      // Email a assignedUsers
      for (const au of appt.assignedUsers) {
        if (au.user.email && au.user.email !== appt.email) {
          await sendMail(
            au.user.email,
            `📹 Videollamada con ${appt.name} en ${window.label}`,
            reminderEmailHtml({ name: au.user.name || 'Equipo', dateStr, meetUrl, minutesBefore: window.minutes })
          ).catch(console.error);
        }
      }

      // Notificaciones internas a assignedUsers
      if (appt.assignedUsers.length > 0) {
        await db.notification.createMany({
          data: appt.assignedUsers.map((au) => ({
            userId:  au.user.id,
            message: `📹 Videollamada con ${appt.name} en ${window.label === '24h' ? '24 horas' : window.label === '1h' ? '1 hora' : '15 minutos'}`,
            type:    'appointment',
            link:    '/dashboard/calendar',
          })),
          skipDuplicates: true,
        });
      }

      // Marcar reminder enviado + actualizar contadores
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

    skipped += 0;
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    sent,
    skipped,
  });
}