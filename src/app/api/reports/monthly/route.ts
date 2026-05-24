import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { MANAGER_ROLES , hasRole } from '@/core/constants/roles';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";



export const dynamic = "force-dynamic";

// GET — genera el HTML del reporte (para preview o PDF via print)
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'reports-monthly-get' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const month    = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year     = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));

  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });

  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId },
    include: { assignedManager: { select: { name: true, email: true } } },
  });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const tasks = await db.task.findMany({
    where: {
      clientId,
      deletedAt: null,
      OR: [
        { dueDate:   { gte: startDate, lte: endDate } },
        { createdAt: { gte: startDate, lte: endDate } },
      ],
    },
    include: {
      assignedUser: { select: { name: true, email: true, color: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const appointments = await db.appointment.findMany({
    where: {
      email: client.email,
      date: { gte: startDate, lte: endDate },
      isInternal: false,
    },
    orderBy: { date: 'asc' },
  });

  const activities = await db.activity.findMany({
    where: {
      clientId,
      startDate: { gte: startDate, lte: endDate },
    },
    include: {
      assignedUser: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const completed   = tasks.filter(t => t.status === "completed").length;
  const pending     = tasks.filter(t => t.status === "pending").length;
  const inProgress  = tasks.filter(t => t.status === "in_progress").length;
  const cancelled   = tasks.filter(t => t.status === "cancelled").length;
  const total       = tasks.length;
  const pct         = total > 0 ? Math.round((completed / total) * 100) : 0;

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const monthName = monthNames[month - 1];

  const statusLabel: Record<string, string> = {
    pending: "Pendiente", in_progress: "En Progreso",
    completed: "Completada", cancelled: "Cancelada",
  };
  const statusColor: Record<string, string> = {
    pending: "#f59e0b", in_progress: "#3b82f6",
    completed: "#10b981", cancelled: "#ef4444",
  };
  const priorityLabel: Record<string, string> = {
    low: "Baja", medium: "Media", high: "Alta",
  };

  const apptRows = appointments.map(a => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827">${a.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:center">
        ${new Date(a.date).toLocaleDateString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
        <span style="background:#d1fae520;color:#10b981;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">
          ${a.status === "confirmed" ? "Confirmada" : a.status === "cancelled" ? "Cancelada" : "Programada"}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;text-align:center">
        ${a.meetUrl ? '<a href="' + a.meetUrl + '" style="color:#4f46e5">Meet</a>' : "—"}
      </td>
    </tr>
  `).join("");

  const taskRows = tasks.map(t => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827">${t.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
        <span style="background:${statusColor[t.status] || "#6b7280"}20;color:${statusColor[t.status] || "#6b7280"};padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">
          ${statusLabel[t.status] || t.status}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:center">
        ${priorityLabel[t.priority] || t.priority}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:center">
        ${t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX", { day:"numeric", month:"short" }) : "—"}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:center">
        ${t.assignedUser?.name || "—"}
      </td>
    </tr>
  `).join("");

  const activityRows = activities.map(a => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827">${a.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280">
        ${new Date(a.startDate).toLocaleDateString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280">
        ${a.assignedUser?.name || "—"}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
        <span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600">
          ${a.status}
        </span>
      </td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reporte ${monthName} ${year} — ${client.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#f9fafb; color:#111827; }
    .page { max-width:800px; margin:0 auto; background:white; }
    .header { background:linear-gradient(135deg,#4f46e5,#7c3aed); padding:40px 48px; color:white; }
    .header h1 { font-size:28px; font-weight:700; margin-bottom:4px; }
    .header p { font-size:14px; opacity:0.8; }
    .header .meta { margin-top:20px; display:flex; gap:32px; }
    .header .meta div { font-size:13px; opacity:0.7; }
    .header .meta strong { display:block; font-size:15px; opacity:1; margin-bottom:2px; }
    .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:#e5e7eb; }
    .stat { background:white; padding:24px; text-align:center; }
    .stat .num { font-size:32px; font-weight:700; }
    .stat .lbl { font-size:12px; color:#6b7280; margin-top:4px; }
    .stat.completed .num { color:#10b981; }
    .stat.progress .num { color:#3b82f6; }
    .stat.pending .num { color:#f59e0b; }
    .stat.total .num { color:#4f46e5; }
    .progress-bar { padding:24px 48px; border-bottom:1px solid #f3f4f6; }
    .progress-bar .label { font-size:13px; color:#6b7280; margin-bottom:8px; display:flex; justify-content:space-between; }
    .bar { height:8px; background:#e5e7eb; border-radius:99px; overflow:hidden; }
    .bar-fill { height:100%; background:linear-gradient(90deg,#4f46e5,#7c3aed); border-radius:99px; width:${pct}%; }
    .section { padding:32px 48px; }
    .section h2 { font-size:16px; font-weight:600; color:#111827; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .section h2 span { background:#ede9fe; color:#4f46e5; width:24px; height:24px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:12px; }
    table { width:100%; border-collapse:collapse; }
    thead th { padding:10px 12px; background:#f9fafb; text-align:left; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; }
    .empty { text-align:center; padding:32px; color:#9ca3af; font-size:14px; }
    .footer { padding:24px 48px; border-top:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center; }
    .footer p { font-size:12px; color:#9ca3af; }
    @media print {
      body { background:white; }
      .page { max-width:100%; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <h1>Reporte Mensual</h1>
    <p>${monthName} ${year}</p>
    <div class="meta">
      <div><strong>${client.name}</strong>Cliente</div>
      ${client.company ? `<div><strong>${client.company}</strong>Empresa</div>` : ""}
      ${client.assignedManager ? `<div><strong>${client.assignedManager.name}</strong>Project Manager</div>` : ""}
      <div><strong>${new Date().toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" })}</strong>Generado</div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat total"><div class="num">${total}</div><div class="lbl">Total Tareas</div></div>
    <div class="stat completed"><div class="num">${completed}</div><div class="lbl">Completadas</div></div>
    <div class="stat progress"><div class="num">${inProgress}</div><div class="lbl">En Progreso</div></div>
    <div class="stat pending"><div class="num">${pending}</div><div class="lbl">Pendientes</div></div>
  </div>

  <!-- Progress -->
  <div class="progress-bar">
    <div class="label"><span>Progreso general</span><strong>${pct}%</strong></div>
    <div class="bar"><div class="bar-fill"></div></div>
  </div>

  <!-- Tasks -->
  <div class="section">
    <h2><span>${tasks.length}</span> Tareas del Mes</h2>
    ${tasks.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Tarea</th><th style="text-align:center">Estado</th>
          <th style="text-align:center">Prioridad</th>
          <th style="text-align:center">Vence</th>
          <th style="text-align:center">Asignado</th>
        </tr>
      </thead>
      <tbody>${taskRows}</tbody>
    </table>` : '<p class="empty">Sin tareas este mes</p>'}
  </div>

  <!-- Activities -->
  ${activities.length > 0 ? `
  <div class="section" style="border-top:1px solid #f3f4f6">
    <h2><span>${activities.length}</span> Actividades</h2>
    <table>
      <thead>
        <tr><th>Actividad</th><th>Fecha</th><th>Responsable</th><th style="text-align:center">Estado</th></tr>
      </thead>
      <tbody>${activityRows}</tbody>
    </table>
  </div>` : ""}

  ${appointments.length > 0 ? `
  <div class="section" style="border-top:1px solid #f3f4f6">
    <h2><span>${appointments.length}</span> Reuniones</h2>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th style="text-align:center">Fecha</th>
          <th style="text-align:center">Estado</th>
          <th style="text-align:center">Link</th>
        </tr>
      </thead>
      <tbody>${apptRows}</tbody>
    </table>
  </div>` : ""}
  <!-- Footer -->
  <div class="footer">
    <p>BoostMarketing CRM &mdash; Reporte generado automaticamente</p>
    <p>${client.email}</p>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// POST — enviar reporte por email
export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN", "PROJECT_MANAGER"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json();
  const { clientId, month, year, recipientEmail } = body;

  if (!clientId || !recipientEmail) {
    return NextResponse.json({ error: "clientId y recipientEmail requeridos" }, { status: 400 });
  }

  const client = await db.client.findFirst({ where: { id: clientId, workspaceId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const m = month || new Date().getMonth() + 1;
  const y = year  || new Date().getFullYear();
  const monthName = monthNames[m - 1];

  const reportUrl = `${process.env.NEXTAUTH_URL}/api/reports/monthly?clientId=${clientId}&month=${m}&year=${y}`;

  await sendMail(
    recipientEmail,
    `Reporte ${monthName} ${y} — ${client.name}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px;text-align:center">
        <h1 style="color:white;margin:0;font-size:20px">Reporte Mensual</h1>
        <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px">${monthName} ${y} &mdash; ${client.name}</p>
      </div>
      <div style="padding:28px">
        <p style="color:#374151">Te compartimos el reporte de actividades del mes de <strong>${monthName} ${y}</strong> para el cliente <strong>${client.name}</strong>.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${reportUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Ver Reporte Completo
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">BoostMarketing CRM &mdash; Reporte generado automaticamente</p>
      </div>
    </div>`
  );

  return NextResponse.json({ ok: true, message: `Reporte enviado a ${recipientEmail}` });
}
