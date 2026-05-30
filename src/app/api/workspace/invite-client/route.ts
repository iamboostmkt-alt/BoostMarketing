import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { sendMail } from '@/lib/mailer';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email(),
  clientName: z.string().min(1),
  clientId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'invite-client' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, clientName, clientId } = parsed.data;

  await db.workspaceInvite.updateMany({
    where: { email: { equals: email, mode: 'insensitive' }, workspaceId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.workspaceInvite.create({
    data: { workspaceId, email, role: 'CLIENT', token, invitedBy: userId, expiresAt, isClient: true, clientName },
  });

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
  const inviteUrl = `${APP_URL}/invite/${token}`;

  await sendMail(
    email,
    `Accede a tu portal en ${workspace?.name ?? 'BoostMarketing'}`,
    `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#07070A;color:#F5F7FA;padding:40px;">
    <h2 style="color:#8B5CF6;">¡Bienvenido/a, ${clientName}!</h2>
    <p><strong>${workspace?.name}</strong> te ha dado acceso a tu portal de cliente.</p>
    <p>Haz clic para crear tu cuenta y ver el avance de tus proyectos.</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#8B5CF6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Acceder a mi portal</a>
    <p style="color:#666;margin-top:24px;font-size:12px;">Este link expira en 7 días.</p>
    </body></html>`
  );

  return NextResponse.json({ ok: true });
}
