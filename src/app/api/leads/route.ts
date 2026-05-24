import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';
import { MANAGER_ROLES } from '@/core/constants/roles';
import { rateLimit } from '@/lib/security/rate-limit';

// POST público — landing videollamada o registro (sin auth requerida)
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 5, windowMs: 60000, identifier: 'leads-post' });
  if (!rl.success) return rl.response;
  try {
    const body = await req.json();
    const { name, email, phone, notes, source } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email no válido' }, { status: 400 });
    }

    // Buscar primer admin para asignar el lead
    const firstAdmin = await db.user.findFirst({
      where: { role: { in: ['ADMIN', 'PROJECT_MANAGER'] }, active: true },
      select: { id: true, workspaceId: true },
    });

    if (!firstAdmin) {
      return NextResponse.json({ error: 'Sistema no configurado' }, { status: 500 });
    }

    // Evitar duplicados por email
    const existing = await db.contact.findFirst({
      where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
    });

    if (existing) {
      return NextResponse.json({ message: 'Registro recibido', contact: { id: existing.id } });
    }

    const contact = await db.contact.create({
      data: {
        userId:      firstAdmin.id,
        workspaceId: firstAdmin.workspaceId,
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        phone:       (phone ?? '').trim(),
        notes:       (notes ?? '').trim(),
        status:      'lead',
        source:      source || 'landing_video',
      },
    });

    // Notificar al admin
    await db.notification.create({
      data: {
        userId:      firstAdmin.id,
        workspaceId: firstAdmin.workspaceId,
        message:     `Nuevo lead desde landing: ${contact.name} (${contact.email})`,
        type:        'lead',
        link:        '/dashboard/contacts',
      },
    }).catch(() => undefined);

    return NextResponse.json({ message: 'Registro recibido', contact: { id: contact.id } }, { status: 201 });
  } catch (error) {
    console.error('[leads POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// GET — solo ADMIN/PM ven los leads
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const status = searchParams.get('status') || 'lead';

    const leads = await db.contact.findMany({
      where: {
        status,
        ...(source && { source }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('[leads GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
