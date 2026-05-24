import { requireWorkspace } from "@/core/auth/require-workspace";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/password";
import { sendMail } from "@/lib/mailer";
import { z } from "zod";
import { Role } from "@prisma/client";

const InviteSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["PROJECT_MANAGER", "TEAM_MEMBER", "DESIGNER", "MARKETING", "SALES_REP"]),
  tempPassword: z.string().min(8).optional(),
});

export async function POST(req: NextRequest) {
  const _rl_workspace_invite = await rateLimit(req, { limit: 10, windowMs: 60000, identifier: 'workspace-invite' });
  if (!_rl_workspace_invite.success) return _rl_workspace_invite.response;

  try {
    const result = await requireWorkspace({ roles: ["ADMIN"] });
    if (!result.ok) return result.response;

    const workspaceId = result.ctx.workspaceId as string | null;
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace asignado." }, { status: 400 });
    }

    const body = await req.json();
    const validation = InviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { name, email, role, tempPassword } = validation.data;

    // Verificar email unico dentro del workspace
    const existing = await db.user.findFirst({
      where: { email: email.toLowerCase(), workspaceId },
    });
    if (existing) {
      return NextResponse.json({ error: "Ese email ya existe en tu workspace." }, { status: 409 });
    }

    const password = tempPassword || Math.random().toString(36).slice(-10) + "A1!";
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role as Role,
        workspaceId,
        active: true,
        color: "#7c3aed",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Email de bienvenida con credenciales temporales
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendMail(
      email,
      `Fuiste invitado a ${(await import("@/lib/db").then(m => m.db.workspace.findUnique({ where: { id: result.ctx.workspaceId }, select: { name: true } })))?.name ?? "la plataforma"}`,
      `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/></head>
      <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="padding:32px 16px;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr><td bgcolor="#7c3aed" style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">BoostMarketing</h1>
          </td></tr>
          <tr><td style="padding:32px;background-color:#ffffff;color:#18181b;font-size:15px;line-height:1.6;">
            <h2 style="color:#18181b;margin:0 0 12px;">👋 Bienvenido, ${name}</h2>
            <p style="color:#6b7280;">Fuiste invitado como <strong style="color:#18181b;">${role.replace("_", " ")}</strong>.</p>
            <div style="background:#f8f9fa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Tus credenciales temporales:</p>
              <p style="margin:0 0 4px;color:#18181b;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0;color:#18181b;"><strong>Password:</strong> ${password}</p>
            </div>
            <div style="text-align:center;margin-top:24px;">
              <a href="${appUrl}/login" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Iniciar sesión</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center;">Cambia tu contraseña después de iniciar sesión.</p>
          </td></tr>
          <tr><td bgcolor="#f9fafb" style="background-color:#f9fafb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">BoostMarketing &middot; Mensaje automático</p>
          </td></tr>
        </table></td></tr></table>
      </body></html>`
    ).catch(console.error);

    await db.activityLog.create({
      data: {
        userId: result.ctx.userId,
        action: "USER_INVITED",
        entity: "User",
        entityId: user.id,
        details: JSON.stringify({ name, email, role }),
        workspaceId,
      },
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("[workspace/invite]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
