import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { sendMail, templateBienvenidaCliente, templateActivacionPortal } from '@/lib/mailer';
import { getBranding } from '@/lib/branding';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'] });
    if (!result.ok) return result.response;
    const { workspaceId } = result.ctx;

    const body = await req.json();
    const { clientId, clientName, clientEmail, tempPassword, assignedManagerId } = body;

    // Modo directo: enviar bienvenida sin buscar en DB
    if (!clientId && clientName && clientEmail) {
      try {
        let pmName = 'Tu Project Manager';
        let pmEmail = '';
        if (assignedManagerId) {
          const pm = await db.user.findUnique({
            where: { id: assignedManagerId },
            select: { name: true, email: true },
          });
          if (pm) { pmName = pm.name || pmName; pmEmail = pm.email; }
        }
        const branding = await getBranding();
        const portalUrl = `${process.env.NEXTAUTH_URL || "https://boostmarketingboost.com"}/dashboard/client-portal`;
        await sendMail(
          clientEmail,
          `Bienvenido/a a tu portal — ${pmName}`,
          templateBienvenidaCliente(clientName, pmName, pmEmail, portalUrl, tempPassword, branding)
        );
        return NextResponse.json({ ok: true });
      } catch (e) {
        console.error('[invite direct]', e);
        return NextResponse.json({ error: 'Error enviando email' }, { status: 500 });
      }
    }

    if (!clientId)
      return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });

    const client = await db.client.findFirst({
      where: { id: clientId, workspaceId },
      include: { assignedManager: { select: { name: true, email: true } } },
    });
    if (!client)
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    // Verificar si ya tiene cuenta de usuario
    const existingUser = await db.user.findFirst({
      where: { email: { equals: client.email, mode: 'insensitive' } },
    });

    const branding = await getBranding();
    const portalUrl = `${process.env.NEXTAUTH_URL || "https://boostmarketingboost.com"}/dashboard/client-portal`;
    const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://boostmarketingboost.com";
    const pmName = client.assignedManager?.name || 'Tu Project Manager';

    let inviteUrl = portalUrl;

    if (!existingUser) {
      // Fix 2: cliente sin cuenta → crear WorkspaceInvite con role=CLIENT
      // y mandar a /invite/[token] en lugar de /register (que crearía un workspace nuevo)
      await db.workspaceInvite.updateMany({
        where: { email: { equals: client.email, mode: 'insensitive' }, workspaceId, usedAt: null },
        data: { expiresAt: new Date() },
      });
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.workspaceInvite.create({
        data: {
          workspaceId,
          email: client.email.toLowerCase(),
          role: 'CLIENT',
          token,
          invitedBy: result.ctx.userId,
          expiresAt,
          isClient: true,
          clientName: client.name,
        },
      });
      // Actualizar portalStatus del cliente a 'invited'
      await db.client.updateMany({
        where: { id: clientId, workspaceId },
        data: { portalStatus: 'invited', invitedAt: new Date() },
      });
      inviteUrl = `${APP_URL}/invite/${token}`;
    }

    // Usar templates dedicados con emailLayout y branding consistente
    const mailHtml = existingUser
      ? templateBienvenidaCliente(client.name, pmName, client.assignedManager?.email ?? '', portalUrl, undefined, branding)
      : templateActivacionPortal(client.name, branding.brandName, inviteUrl, pmName, client.assignedManager?.email ?? '', branding);

    const subject = existingUser
      ? `${pmName} te invita a revisar tu portal en ${branding.brandName}`
      : `Activa tu portal en ${branding.brandName}`;

    await sendMail(client.email, subject, mailHtml);

    return NextResponse.json({ success: true, hasAccount: !!existingUser });
  } catch (error) {
    console.error('[clients/invite POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
