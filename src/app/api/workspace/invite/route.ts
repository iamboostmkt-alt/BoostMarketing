import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const workspaceId = (session.user as any).workspaceId as string | null;
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
      `Fuiste invitado a ${(session.user as any).workspaceName ?? "la plataforma"}`,
      `<div style="font-family:sans-serif;background:#0b0b0f;color:#e5e5e5;padding:32px;border-radius:12px">
        <h2 style="color:#fff;margin:0 0 12px">Bienvenido, ${name}</h2>
        <p style="color:#a0a0b0">Fuiste invitado como <strong style="color:#fff">${role.replace("_", " ")}</strong>.</p>
        <p style="color:#a0a0b0">Tus credenciales temporales:</p>
        <p style="color:#fff"><strong>Email:</strong> ${email}</p>
        <p style="color:#fff"><strong>Password:</strong> ${password}</p>
        <a href="${appUrl}/login" style="display:inline-block;margin-top:20px;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Iniciar sesion</a>
        <p style="color:#666;font-size:12px;margin-top:16px">Cambia tu password despues de iniciar sesion.</p>
      </div>`
    ).catch(console.error);

    await db.activityLog.create({
      data: {
        userId: (session.user as any).id,
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
