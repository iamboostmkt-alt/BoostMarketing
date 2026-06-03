import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { sendMail, templateInvitacionEquipo } from '@/lib/mailer';
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
  // Usar NEXTAUTH_URL consistente con el resto del sistema
  const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const inviteUrl = `${APP_URL}/invite/${token}`;

  await sendMail(
    email,
    `${inviter?.name ?? 'Alguien'} te invitó a unirte a ${workspace?.name ?? 'Weeklink'}`,
    templateInvitacionEquipo(
      inviter?.name ?? 'Un administrador',
      workspace?.name ?? 'Weeklink',
      role,
      inviteUrl,
      branding,
    )
  );

  return NextResponse.json({ ok: true });
}
