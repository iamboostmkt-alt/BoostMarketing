import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const workspaceId = (session.user as any).workspaceId as string | null;
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace asignado." }, { status: 404 });
    }

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
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
