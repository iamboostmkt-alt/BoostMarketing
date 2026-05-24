import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";

export async function GET() {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;
  try {
    const roles = await db.customRole.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ roles });
  } catch {
    return NextResponse.json({ roles: [] });
  }
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json().catch(() => ({}));
  const { name, label, color, description, permissions } = body as {
    name?: string; label?: string; color?: string; description?: string; permissions?: Record<string, boolean>;
  };
  if (!name?.trim() || !label?.trim()) {
    return NextResponse.json({ error: "Nombre y etiqueta son requeridos" }, { status: 400 });
  }
  try {
    const role = await db.customRole.create({
      data: {
        name: name.trim().toUpperCase().replace(/[\s-]+/g, "_"),
        label: label.trim(),
        color: color || "#7c3aed",
        description: description?.trim() || "",
        permissions: permissions ?? {},
        workspaceId,
      },
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un rol con ese nombre" }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const body = await req.json().catch(() => ({}));
  const { id, label, color, description, permissions } = body as {
    id?: string; label?: string; color?: string; description?: string; permissions?: Record<string, boolean>;
  };
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.customRole.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });

  const role = await db.customRole.update({
    where: { id },
    data: {
      ...(label && { label: label.trim() }),
      ...(color && { color }),
      ...(description !== undefined && { description: description.trim() }),
      ...(permissions !== undefined && { permissions }),
    },
  });
  return NextResponse.json({ role });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;
  const { workspaceId } = result.ctx;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const existing = await db.customRole.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });

  await db.customRole.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
