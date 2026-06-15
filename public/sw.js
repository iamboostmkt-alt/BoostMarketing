// Weeklink Service Worker — PWA + App nativa
const CACHE_NAME    = 'weeklink-v2';
const STATIC_CACHE  = 'weeklink-static-v2';
const OFFLINE_URL   = '/offline';

// Assets estáticos a cachear permanentemente
const STATIC_ASSETS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-96.png',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar GET y URLs http/https
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // APIs — siempre network, nunca cache
  if (url.pathname.startsWith('/api/')) return;

  // Assets estáticos — Cache First (más rápido)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Páginas HTML — Network First, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = {
    title:   '🔔 Weeklink',
    body:    'Tienes una nueva notificación',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    url:     '/dashboard',
    tag:     'default',
    silent:  false,
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
      silent:  payload.silent,
      data:    { url: payload.url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open',    title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
      requireInteraction: false,
    })
  );
});

// ── Click en notificación ────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        const existing = windowClients.find(c =>
          c.url.includes(self.location.origin)
        );
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        // Si no, abrir nueva ventana
        return clients.openWindow(url);
      })
  );
});

// ── Background Sync (cuando vuelve la conexión) ──────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'weeklink-sync') {
    event.waitUntil(
      // Notificar a todos los clientes que hay conexión
      clients.matchAll().then(all =>
        all.forEach(client => client.postMessage({ type: 'ONLINE' }))
      )
    );
  }
});

// ── Mensaje desde la app ─────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_VERSION') {
    event.source?.postMessage({ type: 'CACHE_VERSION', version: CACHE_NAME });
  }
});
