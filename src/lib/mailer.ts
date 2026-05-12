import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Sistema de Tareas" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[MAIL] Enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error("[MAIL ERROR]", err);
  }
}

// ─── PLANTILLAS HTML ────────────────────────────────────────

export function templateNuevaTarea(title: string, description: string, dueDate?: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#4f46e5;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">📌 Nueva Tarea Asignada</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${title}</h2>
      <p style="color:#6b7280">${description || "Sin descripción"}</p>
      ${dueDate ? `<p style="color:#ef4444"><strong>⏰ Vence:</strong> ${dueDate}</p>` : ""}
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tasks"
         style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:16px">
        Ver Tarea
      </a>
    </div>
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#9ca3af">
      Sistema de Gestión de Tareas
    </div>
  </div>`;
}

export function templateCambioEstado(title: string, oldStatus: string, newStatus: string) {
  const colors: Record<string, string> = {
    pending:     "#f59e0b",
    in_progress: "#3b82f6",
    completed:   "#10b981",
    cancelled:   "#ef4444",
  };
  const color = colors[newStatus] || "#6b7280";
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:${color};padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">🔄 Estado Actualizado</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${title}</h2>
      <p style="color:#6b7280">
        <strong>Antes:</strong> ${oldStatus} &nbsp;→&nbsp; <strong>Ahora:</strong>
        <span style="color:${color};font-weight:bold">${newStatus}</span>
      </p>
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tasks"
         style="display:inline-block;background:${color};color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:16px">
        Ver Tarea
      </a>
    </div>
  </div>`;
}

export function templateRecordatorio(title: string, dueDate: string, horasRestantes: number) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#f59e0b;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">⏰ Recordatorio de Tarea</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${title}</h2>
      <p style="color:#ef4444;font-size:18px;font-weight:bold">
        Vence en ${horasRestantes} hora${horasRestantes !== 1 ? "s" : ""}
      </p>
      <p style="color:#6b7280">Fecha límite: ${dueDate}</p>
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tasks"
         style="display:inline-block;background:#f59e0b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:16px">
        Completar Tarea
      </a>
    </div>
  </div>`;
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// ─── BIENVENIDA ──────────────────────────────────────────────
export function templateBienvenida(name: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">👋 Bienvenido a BoostMarketing</h1>
    </div>
    <div style="padding:32px">
      <h2 style="color:#111827">Hola, ${name}!</h2>
      <p style="color:#6b7280;line-height:1.6">
        Tu cuenta ha sido creada exitosamente. Ya puedes acceder a todas las herramientas
        de gestión de tareas, clientes y proyectos.
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;color:#374151;font-weight:600">¿Qué puedes hacer?</p>
        <ul style="color:#6b7280;margin:8px 0;padding-left:20px">
          <li>Gestionar tus tareas asignadas</li>
          <li>Ver el estado de proyectos</li>
          <li>Colaborar con tu equipo</li>
        </ul>
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard"
         style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
        Ir al Dashboard
      </a>
    </div>
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#9ca3af">
      BoostMarketing © ${new Date().getFullYear()}
    </div>
  </div>`;
}

// ─── NUEVO COMENTARIO ────────────────────────────────────────
export function templateNuevoComentario(taskTitle: string, authorName: string, comment: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#0ea5e9;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">💬 Nuevo comentario en tu tarea</h1>
    </div>
    <div style="padding:24px">
      <p style="color:#6b7280;margin-top:0">Tarea: <strong style="color:#111827">${taskTitle}</strong></p>
      <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
        <p style="margin:0 0 8px;color:#0369a1;font-weight:600;font-size:14px">${authorName} comentó:</p>
        <p style="margin:0;color:#374151">${comment}</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks"
         style="display:inline-block;background:#0ea5e9;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">
        Ver Comentario
      </a>
    </div>
  </div>`;
}

// ─── TAREA COMPLETADA ────────────────────────────────────────
export function templateTareaCompletada(taskTitle: string, completedBy: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#10b981;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">🎉 Tarea Completada</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${taskTitle}</h2>
      <p style="color:#6b7280">
        <strong>${completedBy}</strong> marcó esta tarea como completada.
      </p>
      <div style="background:#ecfdf5;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
        <span style="font-size:48px">✅</span>
        <p style="color:#065f46;font-weight:600;margin:8px 0 0">¡Excelente trabajo!</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks"
         style="display:inline-block;background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">
        Ver Tareas
      </a>
    </div>
  </div>`;
}

// ─── TAREA VENCIDA ───────────────────────────────────────────
export function templateTareaVencida(taskTitle: string, dueDate: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#ef4444;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">🚨 Tarea Vencida</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${taskTitle}</h2>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
        <p style="color:#dc2626;margin:0;font-weight:600">⚠️ Esta tarea venció el ${dueDate}</p>
        <p style="color:#6b7280;margin:8px 0 0;font-size:14px">Por favor actualiza el estado o contacta a tu manager.</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks"
         style="display:inline-block;background:#ef4444;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">
        Ver Tarea
      </a>
    </div>
  </div>`;
}

// ─── RESUMEN SEMANAL ─────────────────────────────────────────
export function templateResumenSemanal(
  name: string,
  pendientes: number,
  enProgreso: number,
  completadas: number,
  tareas: Array<{title: string, dueDate?: string, status: string}>
) {
  const filas = tareas.map(t => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151">${t.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${t.dueDate || "Sin fecha"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">
        <span style="background:${t.status === 'completed' ? '#ecfdf5' : t.status === 'in_progress' ? '#eff6ff' : '#fefce8'};
                     color:${t.status === 'completed' ? '#065f46' : t.status === 'in_progress' ? '#1d4ed8' : '#854d0e'};
                     padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600">
          ${t.status === 'completed' ? 'Completada' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">📊 Tu Resumen Semanal</h1>
      <p style="color:#c7d2fe;margin:8px 0 0">Semana del ${new Date().toLocaleDateString('es-MX', {day:'numeric',month:'long'})}</p>
    </div>
    <div style="padding:24px">
      <p style="color:#374151">Hola <strong>${name}</strong>, aquí está tu resumen de esta semana:</p>
      <div style="display:flex;gap:12px;margin:20px 0">
        <div style="flex:1;background:#fefce8;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:700;color:#854d0e;margin:0">${pendientes}</p>
          <p style="color:#92400e;margin:4px 0 0;font-size:13px">Pendientes</p>
        </div>
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:700;color:#1d4ed8;margin:0">${enProgreso}</p>
          <p style="color:#1e40af;margin:4px 0 0;font-size:13px">En Progreso</p>
        </div>
        <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:700;color:#065f46;margin:0">${completadas}</p>
          <p style="color:#047857;margin:4px 0 0;font-size:13px">Completadas</p>
        </div>
      </div>
      ${tareas.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600">Tarea</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600">Vence</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600">Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>` : ''}
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks"
         style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:20px">
        Ver todas mis tareas
      </a>
    </div>
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#9ca3af">
      BoostMarketing © ${new Date().getFullYear()} · Recibes esto porque tienes tareas asignadas
    </div>
  </div>`;
}

// ─── RESET DE CONTRASEÑA ─────────────────────────────────────
export function templateResetPassword(name: string, resetUrl: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#7c3aed;padding:28px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">🔐 Restablecer Contraseña</h1>
    </div>
    <div style="padding:28px">
      <p style="color:#374151">Hola <strong>${name}</strong>,</p>
      <p style="color:#6b7280;line-height:1.6">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        Haz clic en el botón para crear una nueva contraseña.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}"
           style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
          Restablecer Contraseña
        </a>
      </div>
      <div style="background:#fef9ff;border:1px solid #e9d5ff;border-radius:8px;padding:14px;margin-top:16px">
        <p style="margin:0;color:#6b7280;font-size:13px">
          ⏰ Este enlace expira en <strong>1 hora</strong>.<br/>
          Si no solicitaste esto, ignora este mensaje — tu contraseña no cambiará.
        </p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#9ca3af">
      BoostMarketing · Por seguridad nunca compartimos tu contraseña
    </div>
  </div>`;
}

// ─── VIDEOLLAMADA CONFIRMADA (AL CLIENTE) ────────────────────
export function templateVideollamadaConfirmada(
  clientName: string,
  date: string,
  meetUrl?: string
) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:28px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">🎥 Videollamada Confirmada</h1>
    </div>
    <div style="padding:28px">
      <p style="color:#374151">Hola <strong>${clientName}</strong>,</p>
      <p style="color:#6b7280">Tu videollamada con el equipo de BoostMarketing ha sido confirmada.</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;color:#0369a1;font-weight:700;font-size:15px">📅 Detalles de la reunión</p>
        <p style="margin:0;color:#374151"><strong>Fecha:</strong> ${date}</p>
        ${meetUrl ? `<p style="margin:8px 0 0;color:#374151"><strong>Enlace:</strong> <a href="${meetUrl}" style="color:#0ea5e9">${meetUrl}</a></p>` : ''}
      </div>
      ${meetUrl ? `
      <div style="text-align:center;margin:20px 0">
        <a href="${meetUrl}"
           style="display:inline-block;background:#0ea5e9;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">
          Unirse a la Videollamada
        </a>
      </div>` : ''}
      <p style="color:#6b7280;font-size:13px">
        Si necesitas reagendar, contáctanos respondiendo este correo.
      </p>
    </div>
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#9ca3af">
      BoostMarketing © ${new Date().getFullYear()}
    </div>
  </div>`;
}

// ─── NUEVA CITA (A LOS MANAGERS) ─────────────────────────────
export function templateNuevaCita(
  clientName: string,
  clientEmail: string,
  date: string,
  notes?: string
) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#f59e0b;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">📆 Nueva Cita Agendada</h1>
    </div>
    <div style="padding:24px">
      <p style="color:#6b7280;margin-top:0">Un prospecto agendó una videollamada:</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 6px;color:#374151"><strong>👤 Nombre:</strong> ${clientName}</p>
        <p style="margin:0 0 6px;color:#374151"><strong>📧 Email:</strong> ${clientEmail}</p>
        <p style="margin:0 0 6px;color:#374151"><strong>📅 Fecha:</strong> ${date}</p>
        ${notes ? `<p style="margin:8px 0 0;color:#6b7280"><strong>📝 Notas:</strong> ${notes}</p>` : ''}
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/admin"
         style="display:inline-block;background:#f59e0b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
        Ver en Dashboard
      </a>
    </div>
  </div>`;
}

// ─── CITA CANCELADA ──────────────────────────────────────────
export function templateCitaCancelada(clientName: string, date: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#ef4444;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">❌ Cita Cancelada</h1>
    </div>
    <div style="padding:24px">
      <p style="color:#374151">Hola <strong>${clientName}</strong>,</p>
      <p style="color:#6b7280">
        Lamentamos informarte que tu cita del <strong>${date}</strong> ha sido cancelada.
      </p>
      <p style="color:#6b7280">Por favor contáctanos para reagendar.</p>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}"
         style="display:inline-block;background:#ef4444;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">
        Reagendar
      </a>
    </div>
  </div>`;
}

// ─── TAREA EDITADA ───────────────────────────────────────────
export function templateTareaEditada(
  taskTitle: string,
  cambios: Array<{campo: string, antes: string, despues: string}>
) {
  const filas = cambios.map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:600">${c.campo}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#ef4444;font-size:13px;text-decoration:line-through">${c.antes}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#10b981;font-size:13px;font-weight:600">${c.despues}</td>
    </tr>
  `).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#6366f1;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">✏️ Tarea Actualizada</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#111827;margin-top:0">${taskTitle}</h2>
      <p style="color:#6b7280">Se realizaron los siguientes cambios:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Campo</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Antes</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Ahora</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks"
         style="display:inline-block;background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:20px">
        Ver Tarea
      </a>
    </div>
  </div>`;
}
