import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { sendMail } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN','PROJECT_MANAGER','TEAM_MEMBER','DESIGNER','MARKETING','SALES_REP']),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, windowMs: 60_000, identifier: 'invite-post' });
  if (!rl.success) return rl.response;
  const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER'] });
  if (!result.ok) return result.response;
  const { userId, workspaceId } = result.ctx;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, role } = parsed.data;

  // Verificar si ya existe usuario con ese email
  const existing = await db.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, workspaceId } });
  if (existing) return NextResponse.json({ error: 'Este email ya tiene una cuenta en el workspace.' }, { status: 409 });

  // Invalidar invitaciones previas pendientes
  await db.workspaceInvite.updateMany({
    where: { email: { equals: email, mode: 'insensitive' }, workspaceId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await db.workspaceInvite.create({
    data: { workspaceId, email, role, token, invitedBy: userId, expiresAt, isClient: false },
  });

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  const inviter = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const branding = await getBranding();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
  const inviteUrl = `${APP_URL}/invite/${token}`;

  await sendMail(
    email,
    `Te invitaron a unirte a ${workspace?.name ?? 'BoostMarketing'}`,
    `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#07070A;color:#F5F7FA;padding:40px;">
    <h2 style="color:#8B5CF6;">¡Tienes una invitación!</h2>
    <p><strong>${inviter?.name ?? 'Un administrador'}</strong> te invitó a unirte a <strong>${workspace?.name}</strong> como <strong>${role}</strong>.</p>
    <p>Este link expira en 7 días.</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#8B5CF6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Aceptar invitación</a>
    <p style="color:#666;margin-top:24px;font-size:12px;">Si no esperabas esta invitación, ignora este correo.</p>
    </body></html>`
  );

  return NextResponse.json({ ok: true });
}
