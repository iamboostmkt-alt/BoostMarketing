/**
 * Server-side realtime broadcast utility.
 *
 * Uses the Supabase REST broadcast endpoint — the server never has to
 * maintain a WebSocket connection. One POST per mutation, non-blocking.
 *
 * Clients subscribed to the "dashboard" channel receive the event instantly.
 */

const CHANNEL = 'realtime:dashboard';

export async function broadcastRealtime(
  event: string,
  payload: unknown,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // not configured — skip silently

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method:  'POST',
      headers: {
        apikey:          key,
        Authorization:   `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messages: [{ topic: CHANNEL, event, payload }],
      }),
    });
  } catch {
    // Non-critical — realtime is best-effort, DB write already succeeded
  }
}
