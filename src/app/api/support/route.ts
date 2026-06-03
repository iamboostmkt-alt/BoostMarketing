import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendMail } from "@/lib/mailer";
import { getBranding } from "@/lib/branding";
import { createNotification } from "@/lib/notifications";
import { db } from "@/lib/db";

const TICKET_TYPES = ["bug", "acceso", "facturacion", "sugerencia", "otro"] as const;
type TicketType = typeof TICKET_TYPES[number];

const TICKET_LABELS: Record<TicketType, string> = {
  bug:         "🐛 Error técnico",
  acceso:      "🔐 Problema de acceso",
  facturacion: "💳 Facturación",
  sugerencia:  "💡 Sugerencia",
  otro:        "📋 Otro",
};

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 5, windowMs: 60_000, identifier: "support-ticket" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, name, email } = result.ctx;

  const { type, message } = await req.json();
  if (!TICKET_TYPES.includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Mensaje muy largo" }, { status: 400 });

  const branding = await getBranding();
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const ticketLabel = TICKET_LABELS[type as TicketType];
  const userName = name ?? email ?? "Usuario";

  // Correo a soporte
  await sendMail(
    supportEmail,
    `🎫 Nuevo ticket: ${ticketLabel} — ${userName}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#7c3aed;">🎫 Nuevo ticket de soporte</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#6b7280;font-size:13px;width:120px;">Tipo</td><td style="padding:8px;font-weight:600;">${ticketLabel}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Usuario</td><td style="padding:8px;">${userName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Email</td><td style="padding:8px;">${email ?? "—"}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Workspace</td><td style="padding:8px;">${workspaceId}</td></tr>
      </table>
      <div style="background:#f8f9fa;border-left:3px solid #7c3aed;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
        <p style="margin:0;color:#374151;">${message.replace(/\n/g, "<br/>")}</p>
      </div>
      <p style="color:#9ca3af;font-size:13px;">Desde: ${appUrl}/dashboard</p>
    </div>`
  );

  // Notificación al usuario confirmando
  await createNotification({
    userId, workspaceId,
    message: `✅ Tu ticket fue enviado — ${ticketLabel}. Te responderemos pronto.`,
    type: "info",
    link: "/dashboard",
  });

  // Notificar a todos los ADMIN del workspace
  const admins = await db.user.findMany({
    where: { workspaceId, role: "ADMIN", id: { not: userId } },
    select: { id: true },
  });
  await Promise.allSettled(admins.map(a =>
    createNotification({
      userId: a.id, workspaceId,
      message: `🎫 Nuevo ticket de soporte: ${ticketLabel} — ${userName}`,
      type: "info",
      link: "/dashboard/chat",
      actorId: userId, actorName: name || email,
    })
  ));

  return NextResponse.json({ ok: true });
}
