import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function GET() {
  const items = await db.testimonial.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const { name, role, company, text, imageUrl, rating, active, order } = body;
  if (!name || !text) {
    return NextResponse.json({ error: "Nombre y testimonio son requeridos." }, { status: 400 });
  }

  const item = await db.testimonial.create({
    data: {
      name:     name.trim(),
      role:     (role ?? "").trim(),
      company:  (company ?? "").trim(),
      text:     text.trim(),
      imageUrl: (imageUrl ?? "").trim(),
      rating:   rating ?? 5,
      active:   active ?? true,
      order:    order ?? 0,
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
  if (fields.name     !== undefined) data.name     = fields.name.trim();
  if (fields.role     !== undefined) data.role     = fields.role.trim();
  if (fields.company  !== undefined) data.company  = fields.company.trim();
  if (fields.text     !== undefined) data.text     = fields.text.trim();
  if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl.trim();
  if (fields.rating   !== undefined) data.rating   = Number(fields.rating);
  if (fields.active   !== undefined) data.active   = Boolean(fields.active);
  if (fields.order    !== undefined) data.order    = Number(fields.order);

  const item = await db.testimonial.update({ where: { id }, data });
  revalidatePath("/");
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });

  await db.testimonial.delete({ where: { id } });
  revalidatePath("/");
  return NextResponse.json({ message: "Eliminado." });
}
