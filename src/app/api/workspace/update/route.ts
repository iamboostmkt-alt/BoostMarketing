import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const workspaceId = session.user.workspaceId as string | null;
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace." }, { status: 400 });
    }
    const body = await req.json();
    const validation = UpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { name: validation.data.name },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("[workspace/update]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
