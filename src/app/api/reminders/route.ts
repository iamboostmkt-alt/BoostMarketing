import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sendEmail,
  taskReminderHtml,
  activityReminderHtml,
  appointmentReminderHtml,
} from '@/lib/resend';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Verify request is from Vercel Cron or an authorised caller.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // not configured → open (dev-safe)
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${cronSecret}`;
}

function fmtDate(d: Date): string {
  try {
    return format(d, "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return d.toLocaleString('es-MX');
  }
}

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://boostmarketingboost.com';

// GET /api/reminders  — called by Vercel Cron (daily at 09:00 UTC)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now      = new Date();
  const in24h    = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
  const in48h    = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1_000);

  let sent   = 0;
  let failed = 0;

  // ── 1. Tasks due in next 24 h ──────────────────────────────────────────────
  try {
    const tasks = await db.task.findMany({
      where: {
        dueDate: { gte: now, lte: in24h },
        status:  { notIn: ['completed', 'done'] },
      },
      include: {
        assignedUser: { select: { name: true, email: true } },
        user:         { select: { name: true, email: true } },
      },
    });

    for (const task of tasks) {
      const recipient = task.assignedUser ?? task.user;
      if (!recipient?.email) continue;
      const ok = await sendEmail({
        to: recipient.email,
        subject: `⏰ Tarea próxima: ${task.title}`,
        html: taskReminderHtml({
          userName:  recipient.name ?? 'Usuario',
          taskTitle: task.title,
          dueDate:   fmtDate(new Date(task.dueDate!)),
          status:    task.status,
          priority:  task.priority,
          appUrl:    APP_URL,
        }),
      });
      ok ? sent++ : failed++;
    }
  } catch (e) {
    console.error('[reminders] tasks query error:', e);
  }

  // ── 2. Overdue tasks (due yesterday, still open) ───────────────────────────
  try {
    const overdue = await db.task.findMany({
      where: {
        dueDate: { gte: yesterday, lt: now },
        status:  { notIn: ['completed', 'done'] },
      },
      include: {
        assignedUser: { select: { name: true, email: true } },
        user:         { select: { name: true, email: true } },
      },
    });

    for (const task of overdue) {
      const recipient = task.assignedUser ?? task.user;
      if (!recipient?.email) continue;
      const ok = await sendEmail({
        to: recipient.email,
        subject: `🔴 Tarea vencida: ${task.title}`,
        html: taskReminderHtml({
          userName:  recipient.name ?? 'Usuario',
          taskTitle: `[VENCIDA] ${task.title}`,
          dueDate:   fmtDate(new Date(task.dueDate!)),
          status:    task.status,
          priority:  task.priority,
          appUrl:    APP_URL,
        }),
      });
      ok ? sent++ : failed++;
    }
  } catch (e) {
    console.error('[reminders] overdue tasks error:', e);
  }

  // ── 3. Activities starting in next 24 h ───────────────────────────────────
  try {
    const acts = await db.activity.findMany({
      where: {
        startDate: { gte: now, lte: in24h },
        status:    { notIn: ['completed'] },
      },
      include: {
        assignedUser: { select: { name: true, email: true } },
        createdBy:    { select: { name: true, email: true } },
      },
    });

    for (const act of acts) {
      const recipient = act.assignedUser ?? act.createdBy;
      if (!recipient?.email) continue;
      const ok = await sendEmail({
        to: recipient.email,
        subject: `📅 Actividad próxima: ${act.title}`,
        html: activityReminderHtml({
          userName:      recipient.name ?? 'Usuario',
          activityTitle: act.title,
          startDate:     fmtDate(new Date(act.startDate)),
          status:        act.status,
          appUrl:        APP_URL,
        }),
      });
      ok ? sent++ : failed++;
    }
  } catch (e) {
    console.error('[reminders] activities error:', e);
  }

  // ── 4. Appointments in next 48 h ─────────────────────────────────────────
  try {
    const appts = await db.appointment.findMany({
      where: {
        date:   { gte: now, lte: in48h },
        status: { not: 'cancelled' },
      },
    });

    if (appts.length > 0) {
      // Notify all admin users about upcoming appointments
      const admins = await db.user.findMany({
        where:  { 
          role: 'ADMIN', 
          active: true,
          email: { not: { contains: 'boostmkt.com' } },
        },
        select: { email: true, name: true },
      });

      for (const appt of appts) {
        for (const admin of admins) {
          const ok = await sendEmail({
            to: admin.email,
            subject: `🎥 Videollamada mañana: ${appt.name}`,
            html: appointmentReminderHtml({
              clientName:  appt.name,
              clientEmail: appt.email,
              date:        fmtDate(new Date(appt.date)),
              notes:       appt.notes,
              adminEmail:  admin.email,
              appUrl:      APP_URL,
            }),
          });
          ok ? sent++ : failed++;
        }
      }
    }
  } catch (e) {
    console.error('[reminders] appointments error:', e);
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    timestamp: now.toISOString(),
  });
}

// POST /api/reminders/status-change  — called internally when status changes
export async function POST(req: NextRequest) {
  // Only callable from server-side (no CRON_SECRET check needed — internal use)
  try {
    const { userEmail, userName, itemTitle, itemType, oldStatus, newStatus } =
      (await req.json()) as {
        userEmail:  string;
        userName:   string;
        itemTitle:  string;
        itemType:   string;
        oldStatus:  string;
        newStatus:  string;
      };

    if (!userEmail) return NextResponse.json({ ok: false });

    const { statusChangeHtml } = await import('@/lib/resend');
    await sendEmail({
      to: userEmail,
      subject: `🔄 ${itemType} actualizado: ${itemTitle}`,
      html: statusChangeHtml({
        userName, itemTitle, itemType, oldStatus, newStatus, appUrl: APP_URL,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[reminders] status-change error:', e);
    return NextResponse.json({ ok: false });
  }
}
