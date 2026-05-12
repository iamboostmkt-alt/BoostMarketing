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
