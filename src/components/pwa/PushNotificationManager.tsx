'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, BellOff, X } from 'lucide-react';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [permission, setPermission]   = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed]   = useState(false);
  const [showBanner, setShowBanner]   = useState(false);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!session || !('Notification' in window) || !VAPID_PUBLIC) return;

    setPermission(Notification.permission);

    // Verificar si ya está suscrito
    navigator.serviceWorker?.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub);
        // Mostrar banner solo si no ha dado permiso y no ha negado
        if (Notification.permission === 'default' && !sub) {
          // Esperar 3 segundos antes de mostrar
          setTimeout(() => setShowBanner(true), 3000);
        }
      });
    });
  }, [session]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC) {
      console.warn('[Push] VAPID key no configurada');
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setShowBanner(false); setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      });

      // Guardar suscripción en DB
      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint:  subJson.endpoint,
          keys:      subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
      setShowBanner(false);
    } catch (err) {
      console.error('[Push] Error al suscribir:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] Error al desuscribir:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!session || !('Notification' in window) || !VAPID_PUBLIC) return null;
  if (permission === 'denied') return null;

  // Banner de solicitud de notificaciones
  if (showBanner && !subscribed) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-[340px] z-50
                      rounded-[20px] border border-[var(--wl-border)] bg-[var(--wl-surface)] shadow-2xl p-4"
        style={{ animation: 'slideUp 0.3s ease' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: 'rgba(124,58,237,0.15)' }}>
            <Bell className="w-5 h-5 text-violet-400" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white mb-0.5">
              Activa las notificaciones
            </p>
            <p className="text-[11px] text-white/45 leading-relaxed">
              Recibe alertas de tareas, mensajes y reuniones en tiempo real.
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={subscribe} disabled={loading}
                className="flex-1 rounded-[10px] py-2 text-[12px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: '#7C3AED' }}>
                {loading ? 'Activando...' : 'Activar'}
              </button>
              <button onClick={() => setShowBanner(false)}
                className="rounded-[10px] px-3 py-2 text-[12px] font-medium text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] transition-colors border border-[var(--wl-border)]">
                Ahora no
              </button>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)}
            className="text-white/20 hover:text-white/50 transition-colors shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      </div>
    );
  }

  return null;
}
