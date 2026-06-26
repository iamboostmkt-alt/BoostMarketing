import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace({ roles: ['ADMIN'] });
  if (!auth.ok) return auth.response;
  const { userId } = auth.ctx;

  const account = await db.account.findFirst({
    where: { userId, provider: 'google' },
    select: { access_token: true, refresh_token: true, expires_at: true, scope: true },
  });

  return NextResponse.json({
    hasAccount: !!account,
    hasAccessToken: !!account?.access_token,
    hasRefreshToken: !!account?.refresh_token,
    tokenExpired: account?.expires_at ? Date.now() / 1000 > account.expires_at : null,
    scope: account?.scope,
    scopeHasCalendar: account?.scope?.includes('calendar') ?? false,
    expiresAt: account?.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
  });
}
