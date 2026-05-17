import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/core/auth/get-session-user';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 });
    const logs = await db.deliverableLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[deliverable-logs GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { taskId, status, note } = await req.json();
    if (!taskId || !status) return NextResponse.json({ error: 'taskId y status requeridos' }, { status: 400 });
    const log = await db.deliverableLog.create({
      data: { taskId, status, note: note || '', createdBy: user.email },
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('[deliverable-logs POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
