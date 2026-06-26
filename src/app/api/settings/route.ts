import { clearBrandingCache } from '@/lib/branding';
import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
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
    const result = await requireWorkspace({ roles: ['ADMIN'] });
    if (!result.ok) return result.response;
    const body = await req.json();
    const { logoUrl, brandName, brandColor } = body;
    const existing = await db.siteSettings.findFirst();
    const data: any = {};
    if (logoUrl    !== undefined) data.logoUrl    = logoUrl;
    if (brandName  !== undefined) data.agencyName = brandName;
    if (brandColor !== undefined) data.brandColor = brandColor;
    const settings = existing
      ? await db.siteSettings.update({ where: { id: existing.id }, data })
      : await db.siteSettings.create({ data });
    clearBrandingCache(); // Invalidar cache de branding
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[settings PATCH]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
