import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function GET() {
  const items = await db.teamMember.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const { name, role = "", imageUrl = "", quote = "", order = 0, isActive = true } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const item = await db.teamMember.create({
    data: { name: name.trim(), role, imageUrl, quote, order: Number(order), isActive },
  });
  revalidatePath("/");
  return NextResponse.json({ item }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  if (data.order !== undefined) data.order = Number(data.order);

  const item = await db.teamMember.update({ where: { id }, data });
  revalidatePath("/");
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  await db.teamMember.delete({ where: { id } });
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
