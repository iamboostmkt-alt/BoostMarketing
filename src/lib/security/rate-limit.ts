import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Cliente Redis Upstash
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache de instancias para no recrear en cada request
const limiters = new Map<string, Ratelimit>();

function getLimiter(key: string, limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${key}:${limit}:${windowMs}`;
  if (!limiters.has(cacheKey)) {
    limiters.set(cacheKey, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix:  `rl:${key}`,
    }));
  }
  return limiters.get(cacheKey)!;
}

interface RateLimitOptions {
  limit:       number;
  windowMs:    number;
  identifier?: string;
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  const limiter = getLimiter(options.identifier ?? 'rl', options.limit, options.windowMs);
  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      return {
        success: false,
      response: NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After':         String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Limit':   String(limit),
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      ),
    };
  }
    return { success: true };
  } catch (e) {
    // Redis down — fail open para no bloquear el servicio
    console.error('[rate-limit] Redis error, failing open:', e);
    return { success: true };
  }
}
