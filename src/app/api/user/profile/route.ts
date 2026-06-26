import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  image: z.string().url().optional().nullable(),
  name:  z.string().min(1).max(80).optional(),
});

// PATCH — actualizar foto y/o nombre del usuario actual
export async function PATCH(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'user-profile' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId } = result.ctx;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.image !== undefined) data.image = parsed.data.image;
  if (parsed.data.name  !== undefined) data.name  = parsed.data.name;
  if ((parsed.data as any).tutorialDone !== undefined) (data as any).tutorialDone = (parsed.data as any).tutorialDone;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const user = await db.user.update({ where: { id: userId }, data, select: { id: true, name: true, image: true } });
  return NextResponse.json({ user });
}

// GET — obtener datos del usuario actual
export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId } = result.ctx;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, color: true, role: true, tutorialDone: true },
  });
  return NextResponse.json({ user });
}
