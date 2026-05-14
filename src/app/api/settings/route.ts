import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await db.settings.create({ data: { id: 'global' } });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[settings GET]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const body = await req.json();
    const { logoUrl, brandName, brandColor } = body;
    const data: Record<string, string> = {};
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (brandName !== undefined) data.brandName = brandName;
    if (brandColor !== undefined) data.brandColor = brandColor;
    const settings = await db.settings.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[settings PATCH]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}