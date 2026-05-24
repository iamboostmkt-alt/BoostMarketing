import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const result = await requireWorkspace();
  if (!result.ok) return result.response;

  const clientId   = req.nextUrl.searchParams.get("clientId");
  const { workspaceId } = result.ctx;

  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  // workspaceId opcional — JWT se refresca automaticamente

  const count = await db.task.count({
    where: {
      clientId,
      workspaceId,
      archivedAt: null,
      status: { notIn: ["completed", "approved", "cancelled"] },
    },
  });

  return NextResponse.json({ count });
}
