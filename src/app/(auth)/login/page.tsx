import { headers } from 'next/headers';
import { db } from '@/lib/db';
import LoginPageClient from './LoginPageClient';

async function getBrandForHost(host: string) {
  const isBoost = host.includes('boostmarketing') || host.includes('boost-marketing');
  if (!isBoost) return { isBoost: false, brandName: 'Weeklink', brandLogo: null };

  try {
    const boostWsId = process.env.NEXT_PUBLIC_BOOST_WORKSPACE_ID || process.env.BOOST_WORKSPACE_ID;
    const settings = boostWsId
      ? await db.siteSettings.findFirst({ where: { workspaceId: boostWsId } })
      : await db.siteSettings.findFirst();
    return {
      isBoost: true,
      brandName: settings?.agencyName || 'BoostMarketing',
      brandLogo: settings?.logoUrl || null,
    };
  } catch {
    return { isBoost: true, brandName: 'BoostMarketing', brandLogo: null };
  }
}

export default async function LoginPage() {
  const host = headers().get('host') || '';
  const brand = await getBrandForHost(host);
  return <LoginPageClient {...brand} />;
}
