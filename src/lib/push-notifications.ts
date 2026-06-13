/**
 * Web Push Notifications Service
 * Envía notificaciones push a todos los dispositivos suscritos de un usuario
 */
import webpush from 'web-push';
import { db } from '@/lib/db';

// VAPID keys — estas van en .env.local
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY             || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL                   || 'mailto:noreply@weeklink.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title:   string;
  body:    string;
  icon?:   string;
  badge?:  string;
  url?:    string;
  tag?:    string;  // agrupa notificaciones del mismo tipo
  data?:   Record<string, any>;
}

/**
 * Envía push notification a un usuario específico (todos sus dispositivos)
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    // No configurado — silent fail
    return;
  }

  let subs: any[];
  try {
    subs = await (db as any).pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return; // Tabla no existe aún (antes de migrar)
  }

  if (!subs.length) return;

  const notification = JSON.stringify({
    title:  payload.title,
    body:   payload.body,
    icon:   payload.icon  || '/icons/icon-192.png',
    badge:  payload.badge || '/icons/badge-72.png',
    url:    payload.url   || '/dashboard',
    tag:    payload.tag,
    data:   payload.data  || {},
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      ).catch(async (err: any) => {
        // 410 = suscripción expirada → eliminar
        if (err.statusCode === 410 || err.statusCode === 404) {
          await (db as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
        throw err;
      })
    )
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[push] ${failed}/${subs.length} notificaciones fallaron para user ${userId}`);
  }
}

/**
 * Envía push a múltiples usuarios
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)));
}

/**
 * Envía push a todo el workspace
 */
export async function sendPushToWorkspace(workspaceId: string, payload: PushPayload, excludeUserId?: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  let subs: any[];
  try {
    subs = await (db as any).pushSubscription.findMany({
      where: {
        workspaceId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true, userId: true },
    });
  } catch { return; }

  if (!subs.length) return;

  const notification = JSON.stringify({
    title:  payload.title,
    body:   payload.body,
    icon:   payload.icon  || '/icons/icon-192.png',
    badge:  payload.badge || '/icons/badge-72.png',
    url:    payload.url   || '/dashboard',
    tag:    payload.tag,
    data:   payload.data  || {},
  });

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      ).catch(async (err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await (db as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      })
    )
  );
}
