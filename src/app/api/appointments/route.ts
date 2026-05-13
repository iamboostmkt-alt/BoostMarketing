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

    const emailNorm = email.trim().toLowerCase();
    const nameTrim  = name.trim();

    // 1. Guardar appointment
    const appointment = await db.appointment.create({
      data: {
        name:   nameTrim,
        email:  emailNorm,
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

    // 2. Crear Contact en CRM (SIN userId - es prospecto sin cuenta)
    // Buscar primer admin para asignar el contacto
    const firstAdmin = await db.user.findFirst({
      where: { role: { in: ['ADMIN', 'PROJECT_MANAGER'] } },
      select: { id: true },
    });

    if (firstAdmin) {
      // Solo crear contact si no existe
      const existingContact = await db.contact.findFirst({ where: { email: emailNorm } });
      if (!existingContact) {
        await db.contact.create({
          data: {
            userId:  firstAdmin.id,
            name:    nameTrim,
            email:   emailNorm,
            phone:   (phone ?? '').trim(),
            status:  'prospect',
            company: '',
            notes:   notes?.trim() || '',
          },
        });
      }

      // 3. Crear actividad en calendario
      try {
        await db.activity.create({
          data: {
            title:           'Videollamada con ' + nameTrim + ' (Prospecto)',
            description:     notes?.trim() || 'Cita agendada via web. Email: ' + emailNorm,
            status:          'pending',
            priority:        'high',
            startDate:       parsedDate,
            endDate:         new Date(parsedDate.getTime() + 60 * 60 * 1000),
            createdByUserId: firstAdmin.id,
            assignedUserId:  firstAdmin.id,
          },
        });
      } catch (actErr) {
        console.error('[appointments] Error creando actividad:', actErr);
      }
    }

    // 4. Notificar a Admin, PM y Ventas
    const notifyUsers = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'SALES_REP', 'PROJECT_MANAGER'] } },
      select: { id: true, email: true },
    });

    if (notifyUsers.length > 0) {
      await db.notification.createMany({
        data: notifyUsers.map((u) => ({
          userId:  u.id,
          message: 'Nuevo prospecto: ' + nameTrim + ' agendo videollamada para el ' + dateStr,
          type:    'appointment',
          link:    '/dashboard/calendar',
        })),
      });

      for (const u of notifyUsers) {
        if (u.email) {
          sendMail(
            u.email,
            'Nuevo prospecto: ' + nameTrim,
            templateNuevaCita(nameTrim, emailNorm, dateStr, notes)
          ).catch(console.error);
        }
      }
    }

    // 5. Email confirmacion al prospecto (SIN magic link)
    sendMail(
      emailNorm,
      'Tu videollamada fue agendada - BoostMarketing',
      templateVideollamadaConfirmada(nameTrim, dateStr)
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
    const { id, status, meetUrl, name, email, phone, date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });
    }

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status  !== undefined) updateData.status  = status;
    if (meetUrl !== undefined) updateData.meetUrl = meetUrl;
    if (name    !== undefined) updateData.name    = (name as string).trim();
    if (email   !== undefined) updateData.email   = (email as string).trim().toLowerCase();
    if (phone   !== undefined) updateData.phone   = (phone as string).trim();
    if (notes   !== undefined) updateData.notes   = (notes as string).trim();
    if (date    !== undefined) {
      const parsed = new Date(date as string);
      if (!isNaN(parsed.getTime())) updateData.date = parsed;
    }
    const appointment = await db.appointment.update({
      where: { id },
      data: updateData,
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireManager();
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });
    await db.appointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[appointments DELETE]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
