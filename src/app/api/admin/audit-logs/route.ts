import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN'] });
  if (!result.ok) return result.response;
  const { userId, workspaceId, role } = result.ctx;
  if (result.ctx.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.activityLog.count({ where: { workspaceId } }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}
