import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const isBoost = host.includes('boostmarketing') || host.includes('boost-marketing');

  if (!isBoost) return NextResponse.json({ name: 'Weeklink', logoUrl: null });

  try {
    const boostWsId = process.env.NEXT_PUBLIC_BOOST_WORKSPACE_ID || process.env.BOOST_WORKSPACE_ID;
    const settings = boostWsId
      ? await db.siteSettings.findFirst({ where: { workspaceId: boostWsId } })
      : await db.siteSettings.findFirst();

    return NextResponse.json({
      name:    settings?.agencyName || 'BoostMarketing',
      logoUrl: settings?.logoUrl    || null,
      color:   '#7C3AED',
    });
  } catch {
    return NextResponse.json({ name: 'BoostMarketing', logoUrl: null });
  }
}
