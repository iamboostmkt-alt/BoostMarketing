import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !MANAGER_ROLES.includes(session.user.role as string)) return null;
  return session;
}

// POST — public: anyone from the landing page can book
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, notes } = body;

    if (!name || !email || !date) {
      return NextResponse.json({ error: 'Nombre, email y fecha son requeridos.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email no válido.' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Fecha no válida.' }, { status: 400 });
    }

    if (parsedDate < new Date()) {
      return NextResponse.json({ error: 'La fecha debe ser en el futuro.' }, { status: 400 });
    }

    const appointment = await db.appointment.create({
      data: {
        name:   name.trim(),
        email:  email.trim().toLowerCase(),
        phone:  (phone ?? '').trim(),
        date:   parsedDate,
        notes:  (notes ?? '').trim(),
        status: 'pending',
      },
    });

    const emailNorm = appointment.email;
    const existingUser = await db.user.findUnique({ where: { email: emailNorm } });
    if (!existingUser) {
      const newUser = await db.user.create({
        data: {
          name:              appointment.name,
          email:             emailNorm,
          role:              'CLIENT',
          lifecycleStatus:   'PROSPECT',
          password:          null,
        },
      });
      await db.client.create({
        data: {
          userId:  newUser.id,
          name:    appointment.name,
          email:   emailNorm,
          phone:   appointment.phone || '',
          status:  'lead',
          company: '',
        },
      });
    }

    // Notify all admins and project managers
    const managers = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'PROJECT_MANAGER'] } },
      select: { id: true },
    });
    if (managers.length > 0) {
      await db.notification.createMany({
        data: managers.map((m) => ({
          userId:  m.id,
          message: `Nueva videollamada agendada por ${name} para el ${parsedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          type:    'appointment',
          link:    '/dashboard/admin',
        })),
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('[appointments POST]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// GET — admin/PM only: list all appointments
export async function GET(req: NextRequest) {
  try {
    const session = await requireManager();
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const appointments = await db.appointment.findMany({
      where:   status ? { status } : undefined,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('[appointments GET]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — admin/PM only: update appointment status
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireManager();
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id y status son requeridos.' }, { status: 400 });
    }

    const appointment = await db.appointment.update({ where: { id }, data: { status } });
    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('[appointments PATCH]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
