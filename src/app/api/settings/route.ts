import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Endpoint legacy — redirige a SiteSettings
async function getOrCreate() {
  let s = await db.siteSettings.findFirst();
  if (!s) s = await db.siteSettings.create({ data: {} });
  return s;
}

export async function GET() {
  try {
    const settings = await getOrCreate();
    return NextResponse.json({ settings: {
      id:         settings.id,
      logoUrl:    settings.logoUrl,
      brandName:  settings.agencyName,
      brandColor: '#7c3aed',
    }});
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
    const { logoUrl, brandName } = body;
    const existing = await db.siteSettings.findFirst();
    const data: any = {};
    if (logoUrl    !== undefined) data.logoUrl    = logoUrl;
    if (brandName  !== undefined) data.agencyName = brandName;
    const settings = existing
      ? await db.siteSettings.update({ where: { id: existing.id }, data })
      : await db.siteSettings.create({ data });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[settings PATCH]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
