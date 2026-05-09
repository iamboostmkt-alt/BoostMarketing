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

    const clients = await db.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Clients GET error:', error);
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
    const { name, email, company, phone, status } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    const client = await db.client.create({
      data: {
        userId,
        name,
        email,
        company: company || '',
        phone: phone || '',
        status: status || 'active',
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'CREATE_CLIENT',
        entity: 'Client',
        entityId: client.id,
        details: JSON.stringify({ name: client.name, email: client.email }),
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Clients POST error:', error);
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
    const { id, name, email, company, phone, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El id es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    const client = await db.client.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_CLIENT',
        entity: 'Client',
        entityId: client.id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Clients PUT error:', error);
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

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    await db.client.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId,
        action: 'DELETE_CLIENT',
        entity: 'Client',
        entityId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error('Clients DELETE error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
