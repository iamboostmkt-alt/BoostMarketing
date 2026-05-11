import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the browser Supabase client (anon key, safe to use client-side).
 * Returns null if NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured —
 * real-time degrades gracefully to the polling fallback.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return _client;
}
