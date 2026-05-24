import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const clientId   = req.nextUrl.searchParams.get("clientId");
  const workspaceId = (session.user as any).workspaceId as string | null;

  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  if (!workspaceId) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 400 });

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
