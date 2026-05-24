import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).max(100),
});

export async function PATCH(req: NextRequest) {
  const _rl_workspace_update = await rateLimit(req, { limit: 10, windowMs: 60000, identifier: 'workspace-update' });
  if (!_rl_workspace_update.success) return _rl_workspace_update.response;

  try {
    const result = await requireWorkspace({ roles: ['ADMIN'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;
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
