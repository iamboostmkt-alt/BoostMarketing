import { db } from '@/lib/db';
import crypto from 'crypto';

export type WebhookEvent =
  | 'task.created' | 'task.updated' | 'task.completed' | 'task.approved'
  | 'client.created' | 'client.updated'
  | 'project.created' | 'project.completed'
  | 'meeting.created'
  | 'member.invited'
  | 'attachment.uploaded'
  | 'task.changes_requested';

export async function triggerWebhooks(
  workspaceId: string,
  event: WebhookEvent,
  payload: Record<string, any>
) {
  try {
    const webhooks = await (db as any).webhookSubscription.findMany({
      where: { workspaceId, active: true, events: { has: event } },
    });

    if (webhooks.length === 0) return;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      workspaceId,
      data: payload,
    });

    await Promise.allSettled(
      webhooks.map(async (wh: any) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Weeklink-Event': event,
          'X-Weeklink-Timestamp': new Date().toISOString(),
        };

        if (wh.secret) {
          const sig = crypto
            .createHmac('sha256', wh.secret)
            .update(body)
            .digest('hex');
          headers['X-Weeklink-Signature'] = `sha256=${sig}`;
        }

        const res = await fetch(wh.url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          console.error(`[webhook] ${wh.url} → ${res.status}`);
        } else {
          console.log(`[webhook] ${event} → ${wh.url} ✓`);
        }
      })
    );
  } catch (err) {
    console.error('[webhooks] Error:', err);
  }
}
