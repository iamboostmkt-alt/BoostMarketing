'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { bus, RT_EVENTS, type RTEventName } from '@/lib/event-bus';

const BROADCAST_EVENTS = Object.values(RT_EVENTS) as RTEventName[];
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

// ── Presence heartbeat ─────────────────────────────────────────────────────────

function updatePresence(status: 'online' | 'offline') {
  fetch('/api/presence', {
    method:    'PATCH',
    headers:   { 'Content-Type': 'application/json' },
    body:      JSON.stringify({ status }),
    keepalive: true, // works in beforeunload
  }).catch(() => undefined);
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId       = (session?.user as { id?: string })?.id;
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef   = useRef<ReturnType<typeof getSupabaseBrowser> extends null
    ? null : ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowser>>['channel']> | null>(null);

  // ── Supabase Realtime channel ─────────────────────────────────────────────

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return; // NEXT_PUBLIC_SUPABASE_ANON_KEY not set → polling fallback

    const channel = supabase.channel('dashboard', {
      config: { broadcast: { self: false } },
    });

    // Route every broadcast event into the local event bus
    BROADCAST_EVENTS.forEach((event) => {
      channel.on('broadcast', { event }, ({ payload }) => {
        bus.emit(event, payload);
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Channel is live
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channelRef as any).current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Presence heartbeat ────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    updatePresence('online');

    heartbeatRef.current = setInterval(() => {
      updatePresence('online');
    }, HEARTBEAT_INTERVAL);

    const handleUnload = () => updatePresence('offline');
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      updatePresence('offline');
    };
  }, [status, userId]);

  return <>{children}</>;
}
