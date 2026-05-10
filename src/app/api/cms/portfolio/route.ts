import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

function requireAdmin(role?: string | null) {
  return role === 'ADMIN';
}

export async function GET() {
  try {
    const items = await db.portfolioItem.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[cms/portfolio GET]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session?.user?.role)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, imageUrl, tags, projectUrl, order, active } = body;

    if (!title) {
      return NextResponse.json({ error: 'El título es requerido.' }, { status: 400 });
    }

    const item = await db.portfolioItem.create({
      data: {
        title:       title.trim(),
        description: (description ?? '').trim(),
        imageUrl:    (imageUrl ?? '').trim(),
        tags:        (tags ?? '').trim(),
        projectUrl:  (projectUrl ?? '').trim(),
        order:       order ?? 0,
        active:      active ?? true,
      },
    });

    revalidatePath('/');
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[cms/portfolio POST]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session?.user?.role)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (fields.title       !== undefined) data.title       = fields.title.trim();
    if (fields.description !== undefined) data.description = fields.description.trim();
    if (fields.imageUrl    !== undefined) data.imageUrl    = fields.imageUrl.trim();
    if (fields.tags        !== undefined) data.tags        = fields.tags.trim();
    if (fields.projectUrl  !== undefined) data.projectUrl  = fields.projectUrl.trim();
    if (fields.order       !== undefined) data.order       = Number(fields.order);
    if (fields.active      !== undefined) data.active      = Boolean(fields.active);

    const item = await db.portfolioItem.update({ where: { id }, data });
    revalidatePath('/');
    return NextResponse.json({ item });
  } catch (err) {
    console.error('[cms/portfolio PUT]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session?.user?.role)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    await db.portfolioItem.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ message: 'Eliminado.' });
  } catch (err) {
    console.error('[cms/portfolio DELETE]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
