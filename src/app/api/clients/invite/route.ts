import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { sendMail, templateBienvenidaCliente } from '@/lib/mailer';
import { getBranding, emailLayout } from '@/lib/branding';
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
        const portalUrl = `${process.env.NEXTAUTH_URL}/dashboard/client-portal`;
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
    const portalUrl = `${process.env.NEXTAUTH_URL}/dashboard/client-portal`;
    const APP_URL = process.env.NEXTAUTH_URL || '';
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
      inviteUrl = `${APP_URL}/invite/${token}`;
    }

    const bodyHtml = existingUser ? `
      <h2 style="color:white;margin:0 0 16px">Accede a tu portal de cliente</h2>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 24px">
        Hola <strong style="color:white">${client.name}</strong>, ${pmName} te ha invitado a revisar el avance de tu proyecto en ${branding.brandName}.
      </p>
      <a href="${portalUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
        Ver mi portal →
      </a>
      <p style="color:rgba(255,255,255,0.4);font-size:13px">
        Inicia sesión con tu cuenta: <strong style="color:rgba(255,255,255,0.6)">${client.email}</strong>
      </p>
    ` : `
      <h2 style="color:white;margin:0 0 16px">Bienvenido a ${branding.brandName}</h2>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 24px">
        Hola <strong style="color:white">${client.name}</strong>, ${pmName} ha creado tu espacio en ${branding.brandName}.
        Crea tu cuenta para acceder a tu portal de cliente y seguir el avance de tus proyectos.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
        Crear mi cuenta →
      </a>
      <p style="color:rgba(255,255,255,0.4);font-size:13px">
        Este link expira en 7 días. Tu email de acceso: <strong style="color:rgba(255,255,255,0.6)">${client.email}</strong>
      </p>
    `;

    await sendMail(client.email, `${pmName} te invita a tu portal en ${branding.brandName}`, emailLayout(bodyHtml, branding));

    return NextResponse.json({ success: true, hasAccount: !!existingUser });
  } catch (error) {
    console.error('[clients/invite POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
