import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspace } from '@/core/auth/require-workspace';

export async function POST(req: NextRequest) {
  try {
    const result = await requireWorkspace({ roles: ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'] });
    if (!result.ok) return result.response;
    const { userId, workspaceId } = result.ctx;
    const user = { ...result.ctx, id: result.ctx.userId };

    const { contactId } = await req.json();
    if (!contactId)
      return NextResponse.json({ error: 'contactId requerido' }, { status: 400 });

    // Obtener el contacto
    const contact = await db.contact.findFirst({ where: { id: contactId, workspaceId } });
    if (!contact)
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });

    // Verificar si ya existe un cliente con ese email
    const existing = await db.client.findFirst({
      where: { email: { equals: contact.email, mode: 'insensitive' } },
    });
    if (existing)
      return NextResponse.json({ error: 'Ya existe un cliente con ese email', clientId: existing.id }, { status: 409 });

    // Crear el cliente
    const client = await db.client.create({
      data: {
        userId:           userId,
        assignedManagerId: user.role === 'PROJECT_MANAGER' ? userId : null,
        name:    contact.name,
        email:   contact.email,
        company: contact.company || '',
        phone:   contact.phone   || '',
        status:  'active',
        workspaceId,
      },
    });

    // Actualizar el contacto a stage activo
    await db.contact.update({
      where: { id: contactId },
      data:  { status: 'converted' },
    });

    // Crear notificación para admins
    const admins = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'PROJECT_MANAGER'] } },
      select: { id: true },
    });
    await db.notification.createMany({
      data: admins.map(a => ({
        userId:      a.id,
        workspaceId: workspaceId ?? '',
        message:     `${contact.name} fue convertido a cliente activo`,
        type:        'client',
        link:        '/dashboard/clients',
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('[contacts/convert POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
