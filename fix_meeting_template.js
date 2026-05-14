const fs = require('fs');

// Fix 1: agregar templateNuevaReunion al final de mailer.ts
const mailerPath = 'src/lib/mailer.ts';
let mailer = fs.readFileSync(mailerPath, 'utf8');
const newTemplate = `
export function templateNuevaReunion(userName: string, meetingTitle: string, date: string, meetUrl?: string) {
  return \`
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">📅 Nueva Reunión Asignada</h1>
    </div>
    <div style="padding:28px">
      <p style="color:#374151">Hola <strong>\${userName}</strong>,</p>
      <p style="color:#6b7280">Se te ha asignado a la siguiente reunión interna:</p>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;color:#6d28d9;font-weight:700;font-size:15px">🗓 \${meetingTitle}</p>
        <p style="margin:0;color:#374151"><strong>Fecha:</strong> \${date}</p>
        \${meetUrl ? \`<p style="margin:8px 0 0;color:#374151"><strong>Enlace:</strong> <a href="\${meetUrl}" style="color:#7c3aed">\${meetUrl}</a></p>\` : ""}
      </div>
      \${meetUrl ? \`
      <div style="text-align:center;margin:20px 0">
        <a href="\${meetUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">
          Unirse a la Reunión
        </a>
      </div>\` : ""}
      <p style="color:#6b7280;font-size:13px">Este es un recordatorio automático del sistema BoostMarketing.</p>
    </div>
  </div>
  \`;
}
`;
mailer += newTemplate;
fs.writeFileSync(mailerPath, mailer, 'utf8');
console.log('Template added to mailer.ts');

// Fix 2: actualizar meetings/route.ts para usar el nuevo template
const meetingsPath = 'src/app/api/meetings/route.ts';
let meetings = fs.readFileSync(meetingsPath, 'utf8');
meetings = meetings.replace(
  'import { sendMail, templateVideollamadaConfirmada } from "@/lib/mailer";',
  'import { sendMail, templateNuevaReunion } from "@/lib/mailer";'
);
meetings = meetings.replace(
  'templateVideollamadaConfirmada(name.trim(), dateStr, (meetUrl ?? "").trim())',
  'templateNuevaReunion(u.name || u.email, name.trim(), dateStr, (meetUrl ?? "").trim())'
);
meetings = meetings.replace(
  'templateVideollamadaConfirmada(upd.name, dateStr, upd.meetUrl || "")',
  'templateNuevaReunion(u.email, upd.name, dateStr, upd.meetUrl || "")'
);
fs.writeFileSync(meetingsPath, meetings, 'utf8');
console.log('meetings/route.ts updated');
console.log('DONE');