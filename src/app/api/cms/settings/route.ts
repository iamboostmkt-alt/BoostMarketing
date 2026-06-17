import { clearBrandingCache } from '@/lib/branding';
import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrCreateSettings(workspaceId?: string) {
  const where = workspaceId ? { workspaceId } : {};
  let settings = await db.siteSettings.findFirst({ where });
  if (!settings) {
    settings = await db.siteSettings.create({ data: workspaceId ? { workspaceId } : {} });
  }
  return settings;
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspace({ roles: ['ADMIN'] });
  const workspaceId = result.ok ? result.ctx.workspaceId : undefined;
  const settings = await getOrCreateSettings(workspaceId);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const body = await req.json();
  const {
    agencyName, logoUrl, faviconUrl,
    heroTitle, heroSubtitle,
    email, phone,
    instagram, facebook, tiktok, linkedin, whatsapp,
  } = body;

  const { workspaceId } = result.ctx;
  const existing = await db.siteSettings.findFirst({ where: { workspaceId } });
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
    : await db.siteSettings.create({ data: { ...data, workspaceId } });
  clearBrandingCache(workspaceId); // Invalidar cache de branding del workspace

  revalidatePath("/");
  return NextResponse.json({ settings });
}
