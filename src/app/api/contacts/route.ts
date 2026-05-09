import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const contacts = await db.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Contacts GET error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, email, company, phone, status, value, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    const contact = await db.contact.create({
      data: {
        userId,
        name,
        email,
        company: company || '',
        phone: phone || '',
        status: status || 'lead',
        value: value || 0,
        notes: notes || '',
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'CREATE_CONTACT',
        entity: 'Contact',
        entityId: contact.id,
        details: JSON.stringify({ name: contact.name, email: contact.email }),
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Contacts POST error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, name, email, company, phone, status, value, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El id es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.contact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (value !== undefined) updateData.value = value;
    if (notes !== undefined) updateData.notes = notes;

    const contact = await db.contact.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_CONTACT',
        entity: 'Contact',
        entityId: contact.id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Contacts PUT error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'El id es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.contact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      );
    }

    await db.contact.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId,
        action: 'DELETE_CONTACT',
        entity: 'Contact',
        entityId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ message: 'Contacto eliminado' });
  } catch (error) {
    console.error('Contacts DELETE error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
