import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MANAGE_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

const clientSelect = {
  id: true,
  userId: true,
  assignedManagerId: true,
  name: true,
  email: true,
  company: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assignedManager: { select: { id: true, name: true, email: true, color: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;
    const { searchParams } = new URL(req.url);
    const status  = searchParams.get('status');
    const search  = searchParams.get('search')?.trim() ?? '';

    // CLIENTs never access this list — they use /api/client-portal instead
    if (!MANAGE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};

    // ADMIN sees all; PM sees their assigned clients + ones they created
    if (role === 'PROJECT_MANAGER') {
      where.OR = [
        { assignedManagerId: userId },
        { userId },
      ];
    }

    if (status && status !== 'all') where.status = status;

    if (search) {
      const searchFilter = [
        { name:    { contains: search, mode: 'insensitive' } },
        { email:   { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        // wrap existing OR inside AND with search
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const clients = await db.client.findMany({
      where,
      select: clientSelect,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[clients GET]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    if (!MANAGE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, company, phone, status, assignedManagerId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    // PMs are always the manager of clients they create (unless admin overrides)
    const resolvedManagerId = role === 'ADMIN'
      ? (assignedManagerId || null)
      : userId;

    const client = await db.client.create({
      data: {
        userId,
        assignedManagerId: resolvedManagerId,
        name,
        email,
        company:  company  || '',
        phone:    phone    || '',
        status:   status   || 'active',
      },
      select: clientSelect,
    });

    await db.activityLog.create({
      data: {
        userId,
        action:   'CREATE_CLIENT',
        entity:   'Client',
        entityId: client.id,
        details:  JSON.stringify({ name: client.name, email: client.email }),
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('[clients POST]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    if (!MANAGE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, company, phone, status, assignedManagerId } = body;

    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    // PMs can only edit their own clients
    if (role === 'PROJECT_MANAGER' && existing.userId !== userId && existing.assignedManagerId !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name              !== undefined) updateData.name              = name;
    if (email             !== undefined) updateData.email             = email;
    if (company           !== undefined) updateData.company           = company;
    if (phone             !== undefined) updateData.phone             = phone;
    if (status            !== undefined) updateData.status            = status;
    if (assignedManagerId !== undefined && role === 'ADMIN') {
      updateData.assignedManagerId = assignedManagerId || null;
    }

    const client = await db.client.update({
      where: { id },
      data:  updateData,
      select: clientSelect,
    });

    await db.activityLog.create({
      data: {
        userId,
        action:   'UPDATE_CLIENT',
        entity:   'Client',
        entityId: client.id,
        details:  JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('[clients PUT]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const role   = session.user.role as string;

    if (!MANAGE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    if (role === 'PROJECT_MANAGER' && existing.userId !== userId && existing.assignedManagerId !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await db.client.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId,
        action:   'DELETE_CLIENT',
        entity:   'Client',
        entityId: id,
        details:  JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error('[clients DELETE]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
