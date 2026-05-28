import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { broadcastRealtime } from "@/lib/realtime-server";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, windowMs: 60_000, identifier: "chat-typing" });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { name } = result.ctx;
  const { room, typing } = await req.json();
  if (!room) return NextResponse.json({ error: "room requerido" }, { status: 400 });
  await broadcastRealtime("presence.updated", {
    room,
    typing,
    name: name ?? "Alguien",
  });
  return NextResponse.json({ ok: true });
}
