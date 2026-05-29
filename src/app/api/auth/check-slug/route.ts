import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'check-slug' });
  if (!rl.success) return rl.response;
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || slug.length < 2) return NextResponse.json({ available: false });
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ available: false });
  const existing = await db.workspace.findUnique({ where: { slug }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
