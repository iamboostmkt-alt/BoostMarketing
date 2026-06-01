import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';
import { z } from 'zod';

const PinSchema = z.object({
  messageId: z.string().min(1),
  pinned: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, windowMs: 60_000, identifier: 'chat-pin' });
  if (!rl.success) return rl.response;

  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;

  const { workspaceId } = result.ctx;

  const body = await req.json();
  const validation = PinSchema.safeParse(body);
  if (!validation.success)
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

  const { messageId, pinned } = validation.data;

  const msg = await db.chatMessage.findFirst({ where: { id: messageId, workspaceId } });
  if (!msg) return NextResponse.json({ error: 'Mensaje no encontrado.' }, { status: 404 });

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data: { pinned },
    select: { id: true, pinned: true },
  });

  return NextResponse.json({ message: updated });
}
