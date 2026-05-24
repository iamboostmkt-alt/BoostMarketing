import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from "@/lib/security/rate-limit";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const _rl_notifications_get = await rateLimit(req, { limit: 60, windowMs: 60000, identifier: 'notifications-get' });
  if (!_rl_notifications_get.success) return _rl_notifications_get.response;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId      = session.user.id;
    const workspaceId = session.user.workspaceId as string | null;
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip  = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where:   { userId, ...(workspaceId ? { workspaceId } : {}) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({ where: { userId, ...(workspaceId ? { workspaceId } : {}) } }),
    ]);

    const unreadCount = await db.notification.count({
      where: { userId, read: false, ...(workspaceId && { workspaceId }) },
    });

    return NextResponse.json({
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const _rl = await rateLimit(req, { limit: 30, windowMs: 60000, identifier: 'notifications-patch' });
  if (!_rl.success) return _rl.response;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const body   = await req.json();

    if (body.all === true) {
      await db.notification.updateMany({
        where: { userId, read: false },
        data:  { read: true },
      });
      return NextResponse.json({ message: 'Todas las notificaciones marcadas como leidas' });
    }

    if (body.id) {
      const notification = await db.notification.findUnique({ where: { id: body.id } });
      if (!notification || notification.userId !== userId) {
        return NextResponse.json({ error: 'Notificacion no encontrada' }, { status: 404 });
      }
      await db.notification.update({ where: { id: body.id }, data: { read: true } });
      return NextResponse.json({ message: 'Notificacion marcada como leida' });
    }

    return NextResponse.json({ error: 'Se requiere id o all: true' }, { status: 400 });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const _rl = await rateLimit(req, { limit: 20, windowMs: 60000, identifier: 'notifications-post' });
  if (!_rl.success) return _rl.response;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const body   = await req.json();
    const { message, type, link } = body;

    if (!message) {
      return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: { userId, message, type: type || 'info', link },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const _rl = await rateLimit(req, { limit: 20, windowMs: 60000, identifier: 'notifications-delete' });
  if (!_rl.success) return _rl.response;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const notification = await db.notification.findUnique({ where: { id } });
      if (!notification || notification.userId !== userId) {
        return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      }
      await db.notification.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    await db.notification.deleteMany({ where: { userId, read: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}