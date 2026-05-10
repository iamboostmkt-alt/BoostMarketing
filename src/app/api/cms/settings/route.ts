import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function getOrCreateSettings() {
  let settings = await db.siteSettings.findFirst();
  if (!settings) {
    settings = await db.siteSettings.create({ data: {} });
  }
  return settings;
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[cms/settings GET]', err);
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
    const {
      agencyName, logoUrl, faviconUrl,
      heroTitle, heroSubtitle,
      email, phone,
      instagram, facebook, tiktok, linkedin, whatsapp,
    } = body;

    const existing = await db.siteSettings.findFirst();

    const data: Record<string, string> = {};
    if (agencyName   !== undefined) data.agencyName   = agencyName;
    if (logoUrl      !== undefined) data.logoUrl      = logoUrl;
    if (faviconUrl   !== undefined) data.faviconUrl   = faviconUrl;
    if (heroTitle    !== undefined) data.heroTitle    = heroTitle;
    if (heroSubtitle !== undefined) data.heroSubtitle = heroSubtitle;
    if (email        !== undefined) data.email        = email;
    if (phone        !== undefined) data.phone        = phone;
    if (instagram    !== undefined) data.instagram    = instagram;
    if (facebook     !== undefined) data.facebook     = facebook;
    if (tiktok       !== undefined) data.tiktok       = tiktok;
    if (linkedin     !== undefined) data.linkedin     = linkedin;
    if (whatsapp     !== undefined) data.whatsapp     = whatsapp;

    const settings = existing
      ? await db.siteSettings.update({ where: { id: existing.id }, data })
      : await db.siteSettings.create({ data });

    revalidatePath('/');
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[cms/settings PATCH]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
