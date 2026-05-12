import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  sendMail,
  templateNuevaCita,
  templateVideollamadaConfirmada,
  templateCitaCancelada,
} from '@/lib/mailer';

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SALES_REP'];

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !MANAGER_ROLES.includes(session.user.role as string)) return null;
  return session;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, notes } = body;

    if (!name || !email || !date) {
      return NextResponse.json({ error: 'Nombre, email y fecha son requeridos.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email no valido.' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Fecha no valida.' }, { status: 400 });
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

    const dateStr = parsedDate.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const emailNorm = appointment.email;

    // Buscar o crear usuario
    let targetUser = await db.user.findUnique({ where: { email: emailNorm } });
    if (!targetUser) {
      targetUser = await db.user.create({
        data: {
          name:            appointment.name,
          email:           emailNorm,
          role:            'CLIENT',
          lifecycleStatus: 'PROSPECT',
          password:        null,
        },
      });
    } else if (!targetUser.lifecycleStatus) {
      // Si existe pero no tiene lifecycleStatus, actualizarlo
      await db.user.update({
        where: { id: targetUser.id },
        data: { lifecycleStatus: 'PROSPECT' },
      });
    }

    // Crear cliente en CRM si no existe
    const existingClient = await db.client.findFirst({
      where: { email: emailNorm },
    });

    if (!existingClient) {
      await db.client.create({
        data: {
          userId:  targetUser.id,
          name:    appointment.name,
          email:   emailNorm,
          phone:   appointment.phone || '',
          status:  'lead',
          company: '',
        },
      });
    }

    // Obtener managers y admins
    const managers = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'PROJECT_MANAGER'] } },
      select: { id: true, email: true },
    });

    // Crear actividad en calendario para managers
    if (managers.length > 0) {
      const firstManager = managers[0];
      await db.activity.create({
        data: {
          title:          `Videollamada con ${name}`,
          description:    notes || '',
          status:         'pending',
          priority:       'high',
          startDate:      parsedDate,
          endDate:        new Date(parsedDate.getTime() + 60 * 60 * 1000),
          createdByUserId: firstManager.id,
          assignedUserId:  firstManager.id,
        },
      });

      // Notificaciones
      await db.notification.createMany({
        data: managers.map((m) => ({
          userId:  m.id,
          message: `Nueva videollamada agendada por ${name} para el ${dateStr}`,
          type:    'appointment',
          link:    '/dashboard/admin',
        })),
      });

      // Emails a managers
      for (const manager of managers) {
        if (manager.email) {
          sendMail(
            manager.email,
            `Nueva cita: ${name}`,
            templateNuevaCita(name, email, dateStr, notes)
          ).catch(console.error);
        }
      }
    }

    // Email confirmacion al cliente
    sendMail(
      appointment.email,
      'Tu videollamada fue agendada - BoostMarketing',
      templateVideollamadaConfirmada(name, dateStr)
    ).catch(console.error);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('[appointments POST]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

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

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireManager();
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await req.json();
    const { id, status, meetUrl } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id y status son requeridos.' }, { status: 400 });
    }

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

    const appointment = await db.appointment.update({
      where: { id },
      data: { status, ...(meetUrl && { meetUrl }) },
    });

    const dateStr = existing.date.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    if (status === 'confirmed') {
      sendMail(
        existing.email,
        'Tu videollamada fue confirmada - BoostMarketing',
        templateVideollamadaConfirmada(existing.name, dateStr, meetUrl)
      ).catch(console.error);
    }

    if (status === 'cancelled') {
      sendMail(
        existing.email,
        'Tu cita fue cancelada - BoostMarketing',
        templateCitaCancelada(existing.name, dateStr)
      ).catch(console.error);
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('[appointments PATCH]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
