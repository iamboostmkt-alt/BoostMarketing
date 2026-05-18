import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { sendMail } from '@/lib/mailer';
import { getBranding, emailLayout } from '@/lib/branding';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { clientId } = await req.json();
    if (!clientId)
      return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: { assignedManager: { select: { name: true, email: true } } },
    });
    if (!client)
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    // Verificar si ya tiene cuenta de usuario
    const existingUser = await db.user.findFirst({
      where: { email: { equals: client.email, mode: 'insensitive' } },
    });

    const branding = await getBranding();
    const loginUrl = `${process.env.NEXTAUTH_URL}/login`;
    const registerUrl = `${process.env.NEXTAUTH_URL}/register`;
    const portalUrl = `${process.env.NEXTAUTH_URL}/dashboard/client-portal`;

    const pmName = client.assignedManager?.name || 'Tu Project Manager';

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
        Hola <strong style="color:white">${client.name}</strong>, ${pmName} ha creado tu espacio de trabajo en ${branding.brandName}. Crea tu cuenta para acceder a tu portal de cliente.
      </p>
      <a href="${registerUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
        Crear mi cuenta →
      </a>
      <p style="color:rgba(255,255,255,0.4);font-size:13px">
        Usa este email al registrarte: <strong style="color:rgba(255,255,255,0.6)">${client.email}</strong>
      </p>
    `;

    await sendMail(client.email, `${pmName} te invita a tu portal en ${branding.brandName}`, emailLayout(bodyHtml, branding));

    return NextResponse.json({ success: true, hasAccount: !!existingUser });
  } catch (error) {
    console.error('[clients/invite POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
