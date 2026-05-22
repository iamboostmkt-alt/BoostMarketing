import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/password";
import { z } from "zod";

const RegisterSchema = z.object({
  agencyName: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Solo minusculas, numeros y guiones"),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Ese slug ya esta en uso." }, { status: 409 });
    }

    // Verificar email unico
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ error: "Ese email ya esta registrado." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Crear workspace + admin en una transaccion
    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: agencyName,
          slug,
          plan: "FREE",
        },
      });

      const user = await tx.user.create({
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
