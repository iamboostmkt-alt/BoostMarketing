import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';
import { MANAGER_ROLES } from '@/core/constants/roles';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });
    const milestones = await db.milestone.findMany({
      where: { clientId },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('[milestones GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { clientId, title, description, date, status } = await req.json();
    if (!clientId || !title || !date)
      return NextResponse.json({ error: 'clientId, title y date requeridos' }, { status: 400 });
    const milestone = await db.milestone.create({
      data: { clientId, title, description: description || '', date: new Date(date), status: status || 'pending' },
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('[milestones POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id, title, description, date, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const milestone = await db.milestone.update({
      where: { id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date        !== undefined && { date: new Date(date) }),
        ...(status      !== undefined && { status }),
      },
    });
    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('[milestones PUT]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !MANAGER_ROLES.includes(user.role as any))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await db.milestone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[milestones DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
