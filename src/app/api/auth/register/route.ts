import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/password";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";

const RegisterSchema = z.object({
  agencyName: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Solo minusculas, numeros y guiones"),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 3, windowMs: 60_000, identifier: 'register' });
  if (!rl.success) return rl.response;
  try {
    const body = await req.json();
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { agencyName, slug, name, email, password } = validation.data;

    // Verificar slug unico
    const existingSlug = await db.workspace.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Ese identificador ya está en uso. Prueba con otro nombre." }, { status: 409 });
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    const hashedPassword = existingUser
      ? existingUser.password ?? ''  // usuario ya existe — no rehashear
      : await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Si el usuario ya existe, verificar contraseña antes de crear workspace adicional
    if (existingUser) {
      const validPass = existingUser.password
        ? await bcrypt.compare(password, existingUser.password)
        : false;
      if (!validPass) {
        // Mensaje genérico para evitar email enumeration
        return NextResponse.json({ error: "No pudimos crear tu cuenta. Verifica los datos e intenta de nuevo." }, { status: 409 });
      }
    }

    // Crear workspace + usuario (o vincular usuario existente)
    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: agencyName,
          slug,
          plan: "FREE",
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días de trial
        },
      });

      let user;
      if (existingUser) {
        // Crear nueva entrada de usuario en el nuevo workspace
        user = await tx.user.create({
          data: {
            name: existingUser.name ?? name,
            email: email.toLowerCase(),
            password: existingUser.password,
            role: "ADMIN",
            workspaceId: workspace.id,
            active: true,
            color: existingUser.color ?? "#7c3aed",
            image: existingUser.image,
          },
          select: { id: true, name: true, email: true, role: true },
        });
      } else {
        user = await tx.user.create({
          data: {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: "ADMIN",
            workspaceId: workspace.id,
            active: true,
            color: "#7c3aed",
          },
          select: { id: true, name: true, email: true, role: true },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "WORKSPACE_CREATED",
          entity: "Workspace",
          entityId: workspace.id,
          details: JSON.stringify({ agencyName, slug }),
          workspaceId: workspace.id,
        },
      });

      return { workspace, user };
    });

    return NextResponse.json({
      message: "Workspace creado exitosamente.",
      workspaceId: result.workspace.id,
      slug: result.workspace.slug,
      userId: result.user.id,
    }, { status: 201 });

  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
