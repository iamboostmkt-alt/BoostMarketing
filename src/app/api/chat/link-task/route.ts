import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { getScopedDb } from '@/lib/db-scoped';
import { rateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const Schema = z.object({
  taskId:   z.string().min(1),
  fileUrl:  z.string().url(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  isVideo:  z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, windowMs: 60_000, identifier: 'chat-link-task' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;
  const body = await req.json();
  const v = Schema.safeParse(body);
  if (!v.success) return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });
  const { taskId, fileUrl, fileName, fileType, isVideo } = v.data;
  const sdb = getScopedDb(workspaceId);
  const task = await sdb.task.findFirst({ where: { id: taskId, workspaceId } });
  if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
  // Crear adjunto
  await sdb.taskAttachment.create({
    data: { taskId, userId, fileUrl, fileName, fileType, fileSize: 0, isInternal: false, workspaceId } as any,
  });
  // Si es video → cambiar status a internal_review
  if (isVideo && !['completed','approved','internal_review'].includes(task.status)) {
    await sdb.task.update({
      where: { id: taskId },
      data: { status: 'internal_review' },
    });
  }
  return NextResponse.json({ ok: true, statusChanged: isVideo });
}
