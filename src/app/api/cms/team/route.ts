import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const items = await db.teamMember.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Error al obtener equipo' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, role = '', imageUrl = '', quote = '', order = 0, isActive = true } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    const item = await db.teamMember.create({ data: { name: name.trim(), role, imageUrl, quote, order: Number(order), isActive } });
    revalidatePath('/');
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear miembro' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    if (data.order !== undefined) data.order = Number(data.order);
    const item = await db.teamMember.update({ where: { id }, data });
    revalidatePath('/');
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar miembro' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.teamMember.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 });
  }
}
