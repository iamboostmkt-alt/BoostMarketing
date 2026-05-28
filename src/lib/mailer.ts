import nodemailer from "nodemailer";
import { getBranding, emailLayout, type Branding } from "@/lib/branding";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${process.env.BRAND_NAME || 'BoostMarketing'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      encoding: 'utf-8',
    });
    console.log(`[MAIL] Enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error("[MAIL ERROR]", err);
  }
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// ─── HELPERS ────────────────────────────────────────────────

function btn(url: string, label: string, color: string) {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:${color};color:white;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-0.2px;">${label}</a>
  </div>`;
}

function infoBox(content: string, color: string) {
  return `<div style="background:#f8f9fa;border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">${content}</div>`;
}

function statusBadge(status: string, color: string) {
  return `<span style="display:inline-block;background:${color}22;color:${color};padding:3px 12px;border-radius:99px;font-size:12px;font-weight:600;border:1px solid ${color}44;">${status}</span>`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://boostmarketingboost.com";

// ─── TEMPLATES ──────────────────────────────────────────────

export function templateNuevaTarea(title: string, description: string, dueDate?: string, b?: Branding, userName?: string) {
  const color = b?.brandColor || '#7c3aed';
  const greeting = userName ? `Hola <strong>${userName}</strong>,` : 'Hola,';
  const content = `
    <p style="color:#6b7280;font-size:15px;margin:0 0 16px;">${greeting}</p>
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;font-weight:700;">📌 Se te asignó una nueva tarea</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">Revisa los detalles y asegúrate de completarla a tiempo.</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:700;font-size:16px;">${title}</p>
      ${description ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${description}</p>` : ''}
      ${dueDate ? `<p style="margin:8px 0 0;color:#f59e0b;font-size:13px;font-weight:600;">⏰ Fecha límite: ${dueDate}</p>` : ''}
    `, color)}
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Si tienes dudas, comunícate con tu PM.</p>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateSubtareaAsignada(title: string, parentTitle: string, description: string, dueDate?: string, b?: Branding, userName?: string) {
  const color = b?.brandColor || '#7c3aed';
  const greeting = userName ? `Hola <strong>${userName}</strong>,` : 'Hola,';
  const content = `
    <p style="color:#6b7280;font-size:15px;margin:0 0 16px;">${greeting}</p>
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;font-weight:700;">✅ Te asignaron una tarea</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">Sigue tu progreso y complétala a tiempo.</p>
    ${infoBox(`
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Parte de</p>
      <p style="margin:0 0 10px;color:#6b7280;font-size:13px;font-weight:600;">${parentTitle}</p>
      <p style="margin:0 0 6px;color:#18181b;font-weight:700;font-size:16px;">${title}</p>
      ${description ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${description}</p>` : ''}
      ${dueDate ? `<p style="margin:8px 0 0;color:#f59e0b;font-size:13px;font-weight:600;">⏰ Fecha límite: ${dueDate}</p>` : ''}
    `, color)}
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Si tienes dudas, comunícate con tu PM.</p>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver mi tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateCambioEstado(title: string, oldStatus: string, newStatus: string, b?: Branding, userName?: string) {
  const colors: Record<string, string> = { pending:'#E2E8F0', in_progress:'#38BDF8', internal_review:'#a78bfa', client_review:'#38BDF8', changes_requested:'#EAB308', approved:'#22C55E', completed:'#22C55E', cancelled:'#ef4444' };
  const labels: Record<string, string> = { draft:'Borrador', pending:'Pendiente', in_progress:'En progreso', internal_review:'Revisión interna', client_review:'En revisión', changes_requested:'Cambios pedidos', approved:'Aprobado', scheduled:'Programado', published:'Publicado', completed:'Completado', cancelled:'Cancelado' };
  const color = colors[newStatus] || b?.brandColor || '#7c3aed';
  const oldLabel = labels[oldStatus] || oldStatus;
  const newLabel = labels[newStatus] || newStatus;
  const greeting = userName ? `<p style="color:#6b7280;font-size:15px;margin:0 0 16px;">Hola <strong>${userName}</strong>,</p>` : '';
  const content = `
    ${greeting}
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;font-weight:700;">🔄 Estado de tarea actualizado</h2>
    <p style="color:#6b7280;margin:0 0 4px;font-size:14px;">La siguiente tarea cambió de estado:</p>
    <p style="color:#18181b;margin:0 0 20px;font-size:15px;font-weight:600;">${title}</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Cambio de estado</p>
      <p style="margin:0;font-size:15px;">
        ${statusBadge(oldLabel, '#6b7280')} &nbsp;&nbsp;→&nbsp;&nbsp; ${statusBadge(newLabel, color)}
      </p>
    `, color)}
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Verifica que el trabajo cumple con los estándares antes de continuar.</p>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver tarea completa', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateRecordatorio(title: string, dueDate: string, horasRestantes: number, b?: Branding) {
  const color = '#f59e0b';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">⏰ Recordatorio de tarea</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">Una tarea está próxima a vencer</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:600;font-size:16px;">${title}</p>
      <p style="margin:0;color:${color};font-weight:700;font-size:18px;">Vence en ${horasRestantes} hora${horasRestantes !== 1 ? 's' : ''}</p>
      <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Fecha límite: ${dueDate}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Completar Tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateBienvenida(name: string, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const brandName = b?.brandName || 'BoostMarketing';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:22px;">👋 Bienvenido, ${name}!</h2>
    <p style="color:#6b7280;margin:0 0 24px;">Tu cuenta en ${brandName} ha sido creada exitosamente.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:#18181b;font-weight:600;">¿Qué puedes hacer?</p>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.8;">
        ✅ Gestionar tus tareas asignadas<br/>
        📊 Ver el estado de proyectos<br/>
        💬 Colaborar con tu equipo<br/>
        📅 Revisar el calendario
      </p>
    `, color)}
    ${btn(`${APP_URL}/dashboard`, 'Ir al Dashboard', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateNuevoComentario(taskTitle: string, authorName: string, comment: string, b?: Branding) {
  const color = '#0ea5e9';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">💬 Nuevo comentario</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">En la tarea: <strong style="color:#18181b;">${taskTitle}</strong></p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:${color};font-weight:600;font-size:13px;">${authorName} comentó:</p>
      <p style="margin:0;color:#374151;">${comment}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver Comentario', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateTareaCompletada(taskTitle: string, completedBy: string, b?: Branding) {
  const color = '#10b981';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">🎉 Tarea completada</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;"><strong style="color:#18181b;">${completedBy}</strong> marcó una tarea como completada</p>
    ${infoBox(`
      <p style="margin:0;color:#18181b;font-weight:600;font-size:16px;">✅ ${taskTitle}</p>
    `, color)}
    <div style="text-align:center;margin:20px 0;padding:20px;background:#f0fdf4;border-radius:12px;">
      <p style="margin:0;color:${color};font-weight:700;font-size:18px;">¡Excelente trabajo! 🚀</p>
    </div>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver Tareas', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateTareaVencida(taskTitle: string, dueDate: string, b?: Branding, userName?: string) {
  const color = '#ef4444';
  const greeting = userName ? `Hola <strong>${userName}</strong>,` : 'Hola,';
  const content = `
    <p style="color:#6b7280;font-size:15px;margin:0 0 16px;">${greeting}</p>
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;font-weight:700;">🚨 Tienes una tarea vencida</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">Una tarea bajo tu responsabilidad ha superado su fecha límite. Por favor actualiza su estado o contacta a tu PM.</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:700;font-size:16px;">${taskTitle}</p>
      <p style="margin:0;color:${color};font-weight:600;font-size:14px;">⚠️ Venció el ${dueDate}</p>
    `, color)}
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Entre más rápido lo resuelvas, mejor para el proyecto.</p>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Actualizar tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateResumenSemanal(name: string, pendientes: number, enProgreso: number, completadas: number, tareas: Array<{title: string, dueDate?: string, status: string}>, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const filas = tareas.map(t => {
    const sc: Record<string,string> = { completed:'#10b981', in_progress:'#3b82f6', pending:'#f59e0b' };
    const sl: Record<string,string> = { completed:'Completada', in_progress:'En progreso', pending:'Pendiente' };
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#18181b;font-size:14px;">${t.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${t.dueDate || 'Sin fecha'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${statusBadge(sl[t.status]||t.status, sc[t.status]||'#6b7280')}</td>
    </tr>`;
  }).join('');
  const content = `
    <h2 style="color:#18181b;margin:0 0 4px;font-size:22px;">📊 Resumen semanal</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hola <strong style="color:#18181b;">${name}</strong>, aquí está tu semana:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="33%" style="padding:0 6px 0 0;"><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center;"><p style="margin:0;font-size:28px;font-weight:700;color:#f59e0b;">${pendientes}</p><p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Pendientes</p></div></td>
        <td width="33%" style="padding:0 3px;"><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;"><p style="margin:0;font-size:28px;font-weight:700;color:#3b82f6;">${enProgreso}</p><p style="margin:4px 0 0;color:#6b7280;font-size:12px;">En Progreso</p></div></td>
        <td width="33%" style="padding:0 0 0 6px;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;"><p style="margin:0;font-size:28px;font-weight:700;color:#10b981;">${completadas}</p><p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Completadas</p></div></td>
      </tr>
    </table>
    ${tareas.length > 0 ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">TAREA</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">VENCE</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">ESTADO</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>` : ''}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver todas mis tareas', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateResetPassword(name: string, resetUrl: string, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">🔐 Restablecer contraseña</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:#18181b;">${name}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
    ${btn(resetUrl, 'Restablecer Contraseña', color)}
    ${infoBox(`<p style="margin:0;color:#9ca3af;font-size:13px;">⏰ Este enlace expira en <strong style="color:#18181b;">1 hora</strong>.<br/>Si no solicitaste esto, ignora este mensaje.</p>`, '#6b7280')}`;
  return b ? emailLayout(content, b) : content;
}

export function templateVideollamadaConfirmada(clientName: string, date: string, meetUrl?: string, b?: Branding) {
  const color = '#0ea5e9';
  const content = `
    <h2 style="color:white;margin:0 0 8px;font-size:20px;">🎥 Videollamada confirmada</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:white;">${clientName}</strong>, tu videollamada ha sido confirmada.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">📅 Detalles de la reunión</p>
      <p style="margin:0 0 6px;color:white;font-size:16px;font-weight:600;">${date}</p>
      ${meetUrl ? `<p style="margin:6px 0 0;"><a href="${meetUrl}" style="color:${color};font-size:14px;">${meetUrl}</a></p>` : ''}
    `, color)}
    ${meetUrl ? btn(meetUrl, '🔗 Unirse a la Videollamada', color) : ''}
    <p style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;">Si necesitas reagendar, contáctanos respondiendo este correo.</p>`;
  return b ? emailLayout(content, b) : content;
}

export function templateNuevaCita(clientName: string, clientEmail: string, date: string, notes?: string, b?: Branding) {
  const color = '#f59e0b';
  const content = `
    <h2 style="color:white;margin:0 0 8px;font-size:20px;">📆 Nueva cita agendada</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Un prospecto agendó una videollamada</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:white;"><span style="color:#9ca3af;font-size:13px;">👤 NOMBRE</span><br/><strong>${clientName}</strong></p>
      <p style="margin:0 0 8px;color:white;"><span style="color:#9ca3af;font-size:13px;">📧 EMAIL</span><br/><strong>${clientEmail}</strong></p>
      <p style="margin:0 ${notes ? '0 8px' : ''};color:white;"><span style="color:#9ca3af;font-size:13px;">📅 FECHA</span><br/><strong>${date}</strong></p>
      ${notes ? `<p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">📝 ${notes}</p>` : ''}
    `, color)}
    ${btn(`${APP_URL}/dashboard/calendar`, 'Ver en Dashboard', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateCitaCancelada(clientName: string, date: string, b?: Branding) {
  const color = '#ef4444';
  const content = `
    <h2 style="color:white;margin:0 0 8px;font-size:20px;">❌ Cita cancelada</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:white;">${clientName}</strong></p>
    ${infoBox(`<p style="margin:0;color:rgba(255,255,255,0.7);">Tu cita del <strong style="color:white;">${date}</strong> ha sido cancelada.<br/><span style="font-size:13px;color:rgba(255,255,255,0.4);">Por favor contáctanos para reagendar.</span></p>`, color)}
    ${btn(APP_URL, 'Reagendar', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateFeedbackCliente(
  taskTitle: string,
  clientName: string,
  type: 'approved' | 'changes_requested' | 'rejected',
  message: string,
  b?: Branding
) {
  const configs = {
    approved:          { emoji: '✅', label: 'aprobó',           color: '#10b981', title: 'Entrega aprobada' },
    changes_requested: { emoji: '📝', label: 'solicitó cambios en', color: '#f59e0b', title: 'Cambios solicitados' },
    rejected:          { emoji: '❌', label: 'rechazó',           color: '#ef4444', title: 'Entrega rechazada' },
  };
  const cfg = configs[type];
  const content = `
    <h2 style="color:white;margin:0 0 8px;font-size:20px;">${cfg.emoji} ${cfg.title}</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">
      <strong style="color:white;">${clientName}</strong> ${cfg.label} una entrega
    </p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:600;font-size:16px;">${taskTitle}</p>
      ${message ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">"${message}"</p>` : ''}
    `, cfg.color)}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver en Dashboard', cfg.color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateTareaEditada(taskTitle: string, cambios: Array<{campo: string, antes: string, despues: string}>, b?: Branding) {
  const color = b?.brandColor || '#6366f1';
  const filas = cambios.map(c => `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);color:#6b7280;font-size:13px;">${c.campo}</td>
    <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);color:#ef4444;font-size:13px;text-decoration:line-through;">${c.antes}</td>
    <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);color:#10b981;font-size:13px;font-weight:600;">${c.despues}</td>
  </tr>`).join('');
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">✏️ Tarea actualizada</h2>
    <p style="color:#6b7280;margin:0 0 20px;"><strong style="color:#18181b;">${taskTitle}</strong></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:rgba(255,255,255,0.4);">CAMPO</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:rgba(255,255,255,0.4);">ANTES</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:rgba(255,255,255,0.4);">AHORA</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver Tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateNuevaReunion(userName: string, meetingTitle: string, date: string, meetUrl?: string, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const content = `
    <h2 style="color:white;margin:0 0 8px;font-size:20px;">📅 Nueva reunión asignada</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:white;">${userName}</strong>, se te asignó a una reunión</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:600;font-size:16px;">🗓 ${meetingTitle}</p>
      <p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">${date}</p>
      ${meetUrl ? `<p style="margin:6px 0 0;"><a href="${meetUrl}" style="color:${color};font-size:14px;">${meetUrl}</a></p>` : ''}
    `, color)}
    ${meetUrl ? btn(meetUrl, 'Unirse a la Reunión', color) : ''}`;
  return b ? emailLayout(content, b) : content;
}

export function templateRecordatorioVideollamada(params: { name: string; dateStr: string; meetUrl: string; minutesBefore: number; }, b?: Branding) {
  const { name, dateStr, meetUrl, minutesBefore } = params;
  const color = '#0ea5e9';
  const label = minutesBefore >= 1440 ? '24 horas' : minutesBefore >= 60 ? '1 hora' : '15 minutos';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">⏰ Recordatorio de videollamada</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:white;">${name}</strong>, tu reunión comienza en <strong style="color:${color};">${label}</strong></p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📅 Fecha y hora</p>
      <p style="margin:0;color:white;font-size:16px;font-weight:600;">${dateStr}</p>
    `, color)}
    ${meetUrl ? btn(meetUrl, '🔗 Unirse a la Reunión', color) : ''}
    <p style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;">Si tienes alguna pregunta, responde a este correo.</p>`;
  return b ? emailLayout(content, b) : content;
}


// ─── NUEVOS TEMPLATES IMPORTANTES ──────────────────────────

export function templateNuevoClienteAsignado(pmName: string, clientName: string, clientEmail: string, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">🏢 Nuevo cliente asignado</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Hola <strong style="color:#18181b;">${pmName}</strong>, se te ha asignado un nuevo cliente.</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:600;font-size:16px;">${clientName}</p>
      <p style="margin:0;color:#6b7280;font-size:14px;">📧 ${clientEmail}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/clients`, 'Ver cliente', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateBienvenidaCliente(clientName: string, pmName: string, pmEmail: string, portalUrl: string, tempPassword?: string, b?: Branding) {
  const color = b?.brandColor || '#7c3aed';
  const brandName = b?.brandName || 'BoostMarketing';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:22px;">👋 Bienvenido/a, ${clientName}!</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Tu cuenta en <strong style="color:#18181b;">${brandName}</strong> ha sido creada. Tu Project Manager asignado es <strong style="color:#18181b;">${pmName}</strong>.</p>
    ${tempPassword ? infoBox(`
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Contraseña temporal</p>
      <p style="margin:0;font-family:monospace;font-size:20px;font-weight:700;color:#18181b;letter-spacing:3px;">${tempPassword}</p>
      <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Cámbiala al ingresar por primera vez.</p>
    `, color) : ''}
    ${btn(portalUrl, 'Acceder a mi portal →', color)}
    <p style="color:#9ca3af;font-size:13px;text-align:center;">¿Dudas? Escríbele a tu PM: <a href="mailto:${pmEmail}" style="color:${color};">${pmEmail}</a></p>`;
  return b ? emailLayout(content, b) : content;
}

export function templateSubtareaCompletada(parentTitle: string, subtaskTitle: string, completedBy: string, b?: Branding) {
  const color = '#10b981';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">✅ Subtarea completada</h2>
    <p style="color:#6b7280;margin:0 0 20px;"><strong style="color:#18181b;">${completedBy}</strong> completó una subtarea</p>
    ${infoBox(`
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Tarea padre</p>
      <p style="margin:0 0 8px;color:#18181b;font-weight:600;">${parentTitle}</p>
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Subtarea completada</p>
      <p style="margin:0;color:${color};font-weight:600;">↳ ${subtaskTitle}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Ver tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateMilestoneCompletado(milestoneTitle: string, clientName: string, b?: Branding) {
  const color = '#f59e0b';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">🏁 Milestone completado</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Un hito del proyecto ha sido alcanzado</p>
    ${infoBox(`
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Cliente</p>
      <p style="margin:0 0 8px;color:#18181b;font-weight:600;">${clientName}</p>
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Milestone</p>
      <p style="margin:0;color:${color};font-weight:700;font-size:18px;">🏆 ${milestoneTitle}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/clients`, 'Ver proyecto', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateEntregaListaParaRevisar(taskTitle: string, clientName: string, assigneeName: string, b?: Branding) {
  const color = '#8b5cf6';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">📤 Entrega lista para revisar</h2>
    <p style="color:#6b7280;margin:0 0 20px;"><strong style="color:#18181b;">${assigneeName}</strong> envió una entrega a revisión</p>
    ${infoBox(`
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Cliente</p>
      <p style="margin:0 0 8px;color:#18181b;font-weight:600;">${clientName}</p>
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Entrega</p>
      <p style="margin:0;color:#18181b;font-weight:600;">${taskTitle}</p>
    `, color)}
    ${btn(`${APP_URL}/dashboard/tasks`, 'Revisar entrega', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateArchivoSubido(
  taskTitle: string,
  uploaderName: string,
  fileName: string,
  fileUrl: string,
  parentTitle?: string,
  b?: Branding
) {
  const color = b?.brandColor || '#7c3aed';
  const parentRow = parentTitle
    ? `<p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Tarea padre</p><p style="margin:0 0 10px;color:#6b7280;font-size:13px;font-weight:600;">${parentTitle}</p>`
    : '';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">&#128206; Archivo subido para revisión</h2>
    <p style="color:#6b7280;margin:0 0 20px;"><strong style="color:#18181b;">${uploaderName}</strong> subió un archivo y está esperando tu revisión.</p>
    ${infoBox(
      parentRow +
      `<p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Tarea</p>` +
      `<p style="margin:0 0 10px;color:#18181b;font-weight:700;font-size:16px;">${taskTitle}</p>` +
      `<p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Archivo</p>` +
      `<p style="margin:0;"><a href="${fileUrl}" style="color:${color};font-size:14px;font-weight:600;">&#128196; ${fileName}</a></p>`,
      color
    )}
    ${btn(APP_URL + '/dashboard/tasks', 'Revisar entrega', color)}`;
  return b ? emailLayout(content, b) : content;
}

export function templateEscalacionPM(
  pmName: string,
  assigneeName: string,
  taskTitle: string,
  dueDate: string,
  overdueCount: number,
  b?: Branding
) {
  const color = '#f59e0b';
  const content = `
    <h2 style="color:#18181b;margin:0 0 8px;font-size:20px;">⚠️ Tarea sin actualizar</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;">
      Hola <strong style="color:#18181b;">${pmName}</strong>,
      <strong style="color:#18181b;">${assigneeName}</strong> aún no ha completado su tarea.
      ¿Puedes recordarle?
    </p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#18181b;font-weight:700;font-size:16px;">${taskTitle}</p>
      <p style="margin:0 0 4px;color:#ef4444;font-weight:600;font-size:14px;">⚠️ Venció el ${dueDate}</p>
      <p style="margin:0;color:#9ca3af;font-size:13px;">Se enviaron ${overdueCount} recordatorios a ${assigneeName} sin respuesta.</p>
    `, color)}
    ${btn(APP_URL + '/dashboard/tasks', 'Ver tarea', color)}`;
  return b ? emailLayout(content, b) : content;
}

