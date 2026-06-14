import { NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
      trialEndsAt: true,
      isFoundingMember: true,
      billingCycle: true,
      aiTier: true,
      extraClients: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            clients: true,
            tasks: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ workspace });

  } catch (error) {
    console.error("[workspace/me]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
