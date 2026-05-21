import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter — migrar a @upstash/ratelimit cuando sea multi-tenant
const requests = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  limit:       number;  // max requests
  windowMs:    number;  // ventana en ms
  identifier?: string;  // prefijo para la key
}

export function rateLimit(req: NextRequest, options: RateLimitOptions): 
  { success: true } | { success: false; response: NextResponse } {
  
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    ?? req.headers.get('x-real-ip') 
    ?? 'unknown';
  
  const key = `${options.identifier ?? 'rl'}:${ip}`;
  const now = Date.now();

  const current = requests.get(key);

  if (!current || now > current.resetAt) {
    requests.set(key, { count: 1, resetAt: now + options.windowMs });
    return { success: true };
  }

  if (current.count >= options.limit) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(options.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  current.count++;
  return { success: true };
}

// Limpiar entries expiradas cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
      if (now > value.resetAt) requests.delete(key);
    }
  }, 5 * 60 * 1000);
}
