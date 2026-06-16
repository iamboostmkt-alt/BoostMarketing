import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/core/auth/require-workspace';
import { db } from '@/lib/db';
import webpush from 'web-push';

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:noreply@weeklink.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (!auth.ok) return auth.response;
    const { workspaceId } = auth.ctx;

    const body = await req.json();
    const { userIds, title, body: msgBody, url = '/dashboard', tag = 'default' } = body;
    if (!title || !msgBody) return NextResponse.json({ error: 'title y body requeridos' }, { status: 400 });

    const whereClause: any = { workspaceId };
    if (userIds?.length > 0) whereClause.userId = { in: userIds };

    const subs = await (db as any).pushSubscription.findMany({ where: whereClause });
    const payload = JSON.stringify({ title, body: msgBody, url, tag,
      icon: '/icons/icon-192.png', badge: '/icons/badge-72.png' });

    const results = await Promise.allSettled(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await (db as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
          }
          throw err;
        }
      })
    );

    return NextResponse.json({
      sent:   results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      total:  subs.length,
    });
  } catch (error: any) {
    console.error('[push/send]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
