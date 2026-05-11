const isDev = process.env.NODE_ENV === 'development';

function ts() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export const log = {
  api(route: string, method: string, extra?: Record<string, unknown>) {
    if (!isDev) return;
    const parts = [`[${ts()}] 📡 ${method} ${route}`];
    if (extra) parts.push(JSON.stringify(extra));
    console.log(parts.join(' '));
  },

  ok(route: string, status: number, ms?: number) {
    if (!isDev) return;
    const timing = ms !== undefined ? ` (${ms}ms)` : '';
    console.log(`[${ts()}] ✅ ${route} → ${status}${timing}`);
  },

  err(route: string, error: unknown, extra?: Record<string, unknown>) {
    if (!isDev) return;
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[${ts()}] ❌ ${route} ERROR: ${msg}`, extra ?? '');
    if (stack) console.error(stack);
  },

  warn(context: string, msg: string) {
    if (!isDev) return;
    console.warn(`[${ts()}] ⚠️  ${context}: ${msg}`);
  },

  info(context: string, msg: string, data?: unknown) {
    if (!isDev) return;
    console.log(`[${ts()}] ℹ️  ${context}: ${msg}`, data !== undefined ? data : '');
  },

  db(query: string, params?: unknown) {
    if (!isDev) return;
    console.log(`[${ts()}] 🗄  SQL: ${query.slice(0, 200)}`, params !== undefined ? params : '');
  },

  supabase(op: string, error: { message: string; code?: string } | null) {
    if (!isDev || !error) return;
    console.error(`[${ts()}] 🔴 Supabase ${op}: [${error.code ?? 'ERR'}] ${error.message}`);
  },
};
