import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  return null;
}

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  try {
    const roles = await db.customRole.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ roles });
  } catch {
    return NextResponse.json({ roles: [] });
  }
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;

  const body = await req.json().catch(() => ({}));
  const { name, label, color, description, permissions } = body as {
    name?: string; label?: string; color?: string; description?: string; permissions?: Record<string, boolean>;
  };

  if (!name?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'Nombre y etiqueta son requeridos' }, { status: 400 });
  }

  try {
    const role = await db.customRole.create({
      data: {
        name: name.trim().toUpperCase().replace(/[\s-]+/g, '_'),
        label: label.trim(),
        color: color || '#7c3aed',
        description: description?.trim() || '',
        permissions: permissions ?? {},
      },
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;

  const body = await req.json().catch(() => ({}));
  const { id, label, color, description, permissions } = body as {
    id?: string; label?: string; color?: string; description?: string; permissions?: Record<string, boolean>;
  };

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const role = await db.customRole.update({
    where: { id },
    data: {
      ...(label && { label: label.trim() }),
      ...(color && { color }),
      ...(description !== undefined && { description: description.trim() }),
      ...(permissions !== undefined && { permissions }),
    },
  });

  return NextResponse.json({ role });
}

export async function DELETE(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return err;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  await db.customRole.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
