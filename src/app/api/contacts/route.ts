import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";

const MANAGER_ROLES = ["ADMIN", "PROJECT_MANAGER", "SALES_REP"];

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: "contacts-get" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = MANAGER_ROLES.includes(role)
    ? { workspaceId }
    : { workspaceId, userId };
  if (status) where.status = status;

  const contacts = await db.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: "contacts-post" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const { name, email, company, phone, status, value, notes } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
  }

  const contact = await db.contact.create({
    data: {
      userId,
      workspaceId,
      name,
      email,
      company: company || "",
      phone: phone || "",
      status: status || "lead",
      value: value || 0,
      notes: notes || "",
    },
  });

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action: "CREATE_CONTACT",
      entity: "Contact",
      entityId: contact.id,
      details: JSON.stringify({ name: contact.name, email: contact.email }),
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const body = await req.json();
  const { id, name, email, company, phone, status, value, notes } = body;

  if (!id) return NextResponse.json({ error: "El id es requerido" }, { status: 400 });

  const canManage = ["ADMIN", "PROJECT_MANAGER"].includes(role);
  const existing = await db.contact.findFirst({
    where: { id, workspaceId },
  });
  if (!existing || (!canManage && existing.userId !== userId)) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (name    !== undefined) updateData.name    = name;
  if (email   !== undefined) updateData.email   = email;
  if (company !== undefined) updateData.company = company;
  if (phone   !== undefined) updateData.phone   = phone;
  if (status  !== undefined) updateData.status  = status;
  if (value   !== undefined) updateData.value   = value;
  if (notes   !== undefined) updateData.notes   = notes;

  const contact = await db.contact.update({ where: { id }, data: updateData });

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action: "UPDATE_CONTACT",
      entity: "Contact",
      entityId: contact.id,
      details: JSON.stringify(updateData),
    },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "El id es requerido" }, { status: 400 });

  const canManage = ["ADMIN", "PROJECT_MANAGER"].includes(role);
  const existing = await db.contact.findFirst({ where: { id, workspaceId } });
  if (!existing || (!canManage && existing.userId !== userId)) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  await db.contact.delete({ where: { id } });

  await db.activityLog.create({
    data: {
      userId,
      workspaceId,
      action: "DELETE_CONTACT",
      entity: "Contact",
      entityId: id,
      details: JSON.stringify({ name: existing.name }),
    },
  });

  return NextResponse.json({ message: "Contacto eliminado" });
}
