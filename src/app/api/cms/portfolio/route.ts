import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function GET() {
  const items = await db.portfolioItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const { title, description, imageUrl, tags, projectUrl, order, active } = body;
  if (!title) return NextResponse.json({ error: "El título es requerido." }, { status: 400 });

  const item = await db.portfolioItem.create({
    data: {
      title:       title.trim(),
      description: (description ?? "").trim(),
      imageUrl:    (imageUrl ?? "").trim(),
      tags:        (tags ?? "").trim(),
      projectUrl:  (projectUrl ?? "").trim(),
      order:       order ?? 0,
      active:      active ?? true,
    },
  });
  revalidatePath("/");
  return NextResponse.json({ item }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (fields.title       !== undefined) data.title       = fields.title.trim();
  if (fields.description !== undefined) data.description = fields.description.trim();
  if (fields.imageUrl    !== undefined) data.imageUrl    = fields.imageUrl.trim();
  if (fields.tags        !== undefined) data.tags        = fields.tags.trim();
  if (fields.projectUrl  !== undefined) data.projectUrl  = fields.projectUrl.trim();
  if (fields.order       !== undefined) data.order       = Number(fields.order);
  if (fields.active      !== undefined) data.active      = Boolean(fields.active);

  const item = await db.portfolioItem.update({ where: { id }, data });
  revalidatePath("/");
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });

  await db.portfolioItem.delete({ where: { id } });
  revalidatePath("/");
  return NextResponse.json({ message: "Eliminado." });
}
