const isDev = process.env.NODE_ENV === 'development';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Sends email via Resend REST API. Never throws — logs errors and returns.
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM ?? 'BoostMarketing <onboarding@resend.dev>';

  if (!apiKey) {
    if (isDev) {
      console.log('\n[email] Resend not configured. Would have sent:');
      console.log('  To:', to);
      console.log('  Subject:', subject);
    }
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'unknown error' }));
      console.error('[email] Resend error:', err);
      return false;
    }

    if (isDev) console.log('[email] Sent to', to, '—', subject);
    return true;
  } catch (e) {
    console.error('[email] fetch error:', e);
    return false;
  }
}

// ── HTML templates ────────────────────────────────────────────────────────────

const BASE = (content: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0b0b0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
  <div style="background:#7c3aed;padding:24px 32px">
    <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700">⚡ BoostMarketing</h1>
  </div>
  <div style="padding:32px">
    ${content}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1f1f2e;color:#666;font-size:12px">
    BoostMarketing CRM · Este es un mensaje automático
  </div>
</div>`;

export function taskReminderHtml(opts: {
  userName: string;
  taskTitle: string;
  dueDate: string;
  status: string;
  priority: string;
  appUrl: string;
}) {
  return BASE(`
    <p style="color:#a0a0b0;font-size:14px;margin-top:0">Hola, <strong style="color:#e5e5e5">${opts.userName}</strong></p>
    <h2 style="color:#fff;font-size:18px;margin:8px 0 4px">📋 Recordatorio de tarea</h2>
    <div style="background:#15151c;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#fff">${opts.taskTitle}</p>
      <p style="margin:0;font-size:13px;color:#888">
        Vence: <strong style="color:#e5e5e5">${opts.dueDate}</strong> &nbsp;|&nbsp;
        Estado: <strong style="color:#e5e5e5">${opts.status}</strong> &nbsp;|&nbsp;
        Prioridad: <strong style="color:#e5e5e5">${opts.priority}</strong>
      </p>
    </div>
    <a href="${opts.appUrl}/dashboard/calendar" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ver en el calendario
    </a>
  `);
}

export function activityReminderHtml(opts: {
  userName: string;
  activityTitle: string;
  startDate: string;
  status: string;
  appUrl: string;
}) {
  return BASE(`
    <p style="color:#a0a0b0;font-size:14px;margin-top:0">Hola, <strong style="color:#e5e5e5">${opts.userName}</strong></p>
    <h2 style="color:#fff;font-size:18px;margin:8px 0 4px">📅 Actividad próxima</h2>
    <div style="background:#15151c;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#fff">${opts.activityTitle}</p>
      <p style="margin:0;font-size:13px;color:#888">
        Inicio: <strong style="color:#e5e5e5">${opts.startDate}</strong> &nbsp;|&nbsp;
        Estado: <strong style="color:#e5e5e5">${opts.status}</strong>
      </p>
    </div>
    <a href="${opts.appUrl}/dashboard/calendar" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ver actividad
    </a>
  `);
}

export function appointmentReminderHtml(opts: {
  clientName: string;
  clientEmail: string;
  date: string;
  notes: string;
  adminEmail: string;
  appUrl: string;
}) {
  return BASE(`
    <h2 style="color:#fff;font-size:18px;margin:8px 0 4px">🎥 Videollamada mañana</h2>
    <div style="background:#15151c;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#fff">${opts.clientName}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#888">${opts.clientEmail}</p>
      <p style="margin:0;font-size:13px;color:#888">
        Fecha: <strong style="color:#e5e5e5">${opts.date}</strong>
      </p>
      ${opts.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#888">Notas: <em style="color:#ccc">${opts.notes}</em></p>` : ''}
    </div>
    <a href="${opts.appUrl}/dashboard/admin" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ver en admin
    </a>
  `);
}

export function statusChangeHtml(opts: {
  userName: string;
  itemTitle: string;
  itemType: string;
  oldStatus: string;
  newStatus: string;
  appUrl: string;
}) {
  return BASE(`
    <p style="color:#a0a0b0;font-size:14px;margin-top:0">Hola, <strong style="color:#e5e5e5">${opts.userName}</strong></p>
    <h2 style="color:#fff;font-size:18px;margin:8px 0 4px">🔄 Cambio de estado</h2>
    <div style="background:#15151c;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#fff">${opts.itemTitle}</p>
      <p style="margin:0;font-size:13px;color:#888">
        Tipo: <strong style="color:#e5e5e5">${opts.itemType}</strong><br/>
        Anterior: <strong style="color:#e5e5e5">${opts.oldStatus}</strong> →
        Nuevo: <strong style="color:#7c3aed">${opts.newStatus}</strong>
      </p>
    </div>
    <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ver dashboard
    </a>
  `);
}
