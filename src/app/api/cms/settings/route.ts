import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrCreateSettings() {
  let settings = await db.siteSettings.findFirst();
  if (!settings) {
    settings = await db.siteSettings.create({ data: {} });
  }
  return settings;
}

export async function GET() {
  const settings = await getOrCreateSettings();
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

  revalidatePath("/");
  return NextResponse.json({ settings });
}
