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
    const items = await db.testimonial.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[cms/testimonials GET]', err);
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
    const { name, role, company, text, imageUrl, rating, active, order } = body;

    if (!name || !text) {
      return NextResponse.json({ error: 'Nombre y testimonio son requeridos.' }, { status: 400 });
    }

    const item = await db.testimonial.create({
      data: {
        name:     name.trim(),
        role:     (role ?? '').trim(),
        company:  (company ?? '').trim(),
        text:     text.trim(),
        imageUrl: (imageUrl ?? '').trim(),
        rating:   rating ?? 5,
        active:   active ?? true,
        order:    order ?? 0,
      },
    });

    revalidatePath('/');
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[cms/testimonials POST]', err);
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
    if (fields.name     !== undefined) data.name     = fields.name.trim();
    if (fields.role     !== undefined) data.role     = fields.role.trim();
    if (fields.company  !== undefined) data.company  = fields.company.trim();
    if (fields.text     !== undefined) data.text     = fields.text.trim();
    if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl.trim();
    if (fields.rating   !== undefined) data.rating   = Number(fields.rating);
    if (fields.active   !== undefined) data.active   = Boolean(fields.active);
    if (fields.order    !== undefined) data.order    = Number(fields.order);

    const item = await db.testimonial.update({ where: { id }, data });
    revalidatePath('/');
    return NextResponse.json({ item });
  } catch (err) {
    console.error('[cms/testimonials PUT]', err);
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

    await db.testimonial.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ message: 'Eliminado.' });
  } catch (err) {
    console.error('[cms/testimonials DELETE]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
