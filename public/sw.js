// Weeklink Service Worker — PWA + Web Push
const CACHE_NAME = 'weeklink-v1';
const OFFLINE_URL = '/offline';

// Archivos a cachear para modo offline
const PRECACHE = [
  '/',
  '/dashboard',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — Network first, cache fallback ────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // APIs siempre en vivo

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = {
    title: '🔔 Weeklink',
    body:  'Tienes una nueva notificación',
    icon:  '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url:   '/dashboard',
    tag:   'default',
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   payload.badge,
      tag:     payload.tag,
      data:    { url: payload.url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open',    title: 'Abrir' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
    })
  );
});

// ── Click en notificación → abrir la app ────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si ya está abierta, enfocarla
        const existing = windowClients.find(c => c.url.includes('weeklink') || c.url.includes('boostmarketing'));
        if (existing) {
          existing.focus();
          existing.navigate(url);
          return;
        }
        // Si no, abrir nueva ventana
        clients.openWindow(url);
      })
  );
});

// ── Push subscription change (browser renueva la suscripción) ────────────────
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then(sub => {
      return fetch('/api/push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
          },
        }),
      });
    })
  );
});
