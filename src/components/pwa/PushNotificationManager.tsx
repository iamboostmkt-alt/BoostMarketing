'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, X } from 'lucide-react';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [permission,  setPermission]  = useState<NotificationPermission>('default');
  const [showPrompt,  setShowPrompt]  = useState(false);
  const [registered,  setRegistered]  = useState(false);

  useEffect(() => {
    if (!session || !('serviceWorker' in navigator) || !VAPID_PUBLIC) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        setRegistered(true);
        const current = Notification.permission;
        setPermission(current);
        if (current === 'granted') {
          subscribeToPush(reg);
        } else if (current === 'default') {
          setTimeout(() => setShowPrompt(true), 3000);
        }
      })
      .catch(() => {});
  }, [session]);

  async function subscribeToPush(reg?: ServiceWorkerRegistration) {
    try {
      const registration = reg || await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as any,
        });
      }
      const subJson = sub.toJSON() as any;
      await fetch('/api/push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint:  subJson.endpoint,
          keys:      subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });
      setPermission('granted');
      setShowPrompt(false);
    } catch {}
  }

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await subscribeToPush();
    else setShowPrompt(false);
  }

  if (!session || !registered || !showPrompt || permission !== 'default') return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      width: 'min(360px, calc(100vw - 32px))',
      background: '#1a1a24',
      border: '1px solid rgba(139,92,246,0.25)',
      borderRadius: 16, padding: '16px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
    }}>
      <button onClick={() => setShowPrompt(false)} style={{
        position: 'absolute', top: 10, right: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,0.3)', padding: 4,
      }}>
        <X size={14} />
      </button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bell size={18} color="#a78bfa" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: '0 0 4px' }}>
            Activa las notificaciones
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
            Recibe avisos de tareas, mensajes y reuniones aunque no tengas la app abierta.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={requestPermission} style={{
              flex: 1, padding: '8px 16px',
              background: '#8B5CF6', color: 'white',
              border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Activar
            </button>
            <button onClick={() => setShowPrompt(false)} style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: 'none', borderRadius: 10,
              fontSize: 13, cursor: 'pointer',
            }}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
