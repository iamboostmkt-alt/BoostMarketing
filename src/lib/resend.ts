import { sendMail as sendMailSmtp } from "@/lib/mailer";

const isDev = process.env.NODE_ENV === "development";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    await sendMailSmtp(to, subject, html);
    return true;
  } catch {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "BoostMarketing <onboarding@resend.dev>";

    if (!apiKey) {
      if (isDev) {
        console.log("\n[email] SMTP failed; Resend also missing. Would have sent:");
        console.log("  To:", to, "Subject:", subject);
      }
      return false;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "unknown error" }));
        console.error("[email] Resend error:", err);
        return false;
      }

      if (isDev) console.log("[email] Resend sent to", to, "-", subject);
      return true;
    } catch (e) {
      console.error("[email] fetch error:", e);
      return false;
    }
  }
}

const BASE = (content: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/><meta name="supported-color-schemes" content="light"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr>
          <td bgcolor="#7c3aed" style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.5px;">BoostMarketing</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;background-color:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <tr>
          <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">BoostMarketing CRM &middot; Mensaje automático</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export function taskReminderHtml(opts: { userName: string; taskTitle: string; dueDate: string; status: string; priority: string; appUrl: string; }) {
  return BASE(`
    <p style="color:#6b7280;font-size:14px;margin-top:0">Hola, <strong style="color:#18181b;">${opts.userName}</strong></p>
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Recordatorio de tarea</h2>
    <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${opts.taskTitle}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Vence: <strong style="color:#18181b;">${opts.dueDate}</strong> | Estado: <strong style="color:#18181b;">${opts.status}</strong> | Prioridad: <strong style="color:#18181b;">${opts.priority}</strong></p>
    </div>
    <a href="${opts.appUrl}/dashboard/calendar" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver en el calendario</a>
  `);
}

export function activityReminderHtml(opts: { userName: string; activityTitle: string; startDate: string; status: string; appUrl: string; }) {
  return BASE(`
    <p style="color:#6b7280;font-size:14px;margin-top:0">Hola, <strong style="color:#18181b;">${opts.userName}</strong></p>
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Actividad proxima</h2>
    <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${opts.activityTitle}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Inicio: <strong style="color:#18181b;">${opts.startDate}</strong> | Estado: <strong style="color:#18181b;">${opts.status}</strong></p>
    </div>
    <a href="${opts.appUrl}/dashboard/calendar" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver actividad</a>
  `);
}

export function appointmentReminderHtml(opts: { clientName: string; clientEmail: string; date: string; notes: string; adminEmail: string; appUrl: string; }) {
  return BASE(`
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Videollamada manana</h2>
    <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#18181b;">${opts.clientName}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${opts.clientEmail}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Fecha: <strong style="color:#18181b;">${opts.date}</strong></p>
      ${opts.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Notas: <em style="color:#374151;">${opts.notes}</em></p>` : ""}
    </div>
    <a href="${opts.appUrl}/dashboard/admin" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver en admin</a>
  `);
}

export function welcomeHtml(opts: { userName: string; appUrl: string }) {
  return BASE(`
    <p style="color:#6b7280;font-size:14px;margin-top:0">Hola, <strong style="color:#18181b;">${opts.userName}</strong></p>
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Bienvenido a BoostMarketing</h2>
    <p style="color:#6b7280;font-size:14px">Tu cuenta ha sido creada exitosamente.</p>
    <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ir al dashboard</a>
  `);
}

export function taskAssignedHtml(opts: { userName: string; taskTitle: string; taskDescription: string; priority: string; dueDate: string; assignedBy: string; appUrl: string; }) {
  return BASE(`
    <p style="color:#6b7280;font-size:14px;margin-top:0">Hola, <strong style="color:#18181b;">${opts.userName}</strong></p>
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Nueva tarea asignada</h2>
    <p style="color:#6b7280;font-size:14px"><strong style="color:#18181b;">${opts.assignedBy}</strong> te asigno una nueva tarea:</p>
    <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${opts.taskTitle}</p>
      ${opts.taskDescription ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${opts.taskDescription}</p>` : ""}
      <p style="margin:0;font-size:13px;color:#6b7280;">Prioridad: <strong style="color:#18181b;">${opts.priority}</strong>${opts.dueDate ? ` | Vence: <strong style="color:#18181b;">${opts.dueDate}</strong>` : ""}</p>
    </div>
    <a href="${opts.appUrl}/dashboard/tasks" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver mis tareas</a>
  `);
}

export function statusChangeHtml(opts: { userName: string; itemTitle: string; itemType: string; oldStatus: string; newStatus: string; appUrl: string; }) {
  return BASE(`
    <p style="color:#6b7280;font-size:14px;margin-top:0">Hola, <strong style="color:#18181b;">${opts.userName}</strong></p>
    <h2 style="color:#18181b;font-size:18px;font-weight:700;margin:8px 0 4px">Cambio de estado</h2>
    <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${opts.itemTitle}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Tipo: <strong style="color:#18181b;">${opts.itemType}</strong><br/>Anterior: <strong style="color:#18181b;">${opts.oldStatus}</strong> → Nuevo: <strong style="color:#7c3aed">${opts.newStatus}</strong></p>
    </div>
    <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Ver dashboard</a>
  `);
}
