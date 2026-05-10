import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKET = 'team-media';

// Lazy singleton — only instantiated on first use, so missing env vars during
// Next.js static analysis / local dev without Supabase don't crash the build.
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export function getPublicUrl(path: string): string {
  const { data } = getSupabaseAdmin().storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
