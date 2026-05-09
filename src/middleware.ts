import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Middleware — SOLE source of truth for route protection.
 * Validates JWT token for all /dashboard/* routes.
 * Unauthenticated users are redirected to /login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (isDev) console.log(`[middleware] no token — redirecting ${pathname} → /login`);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isDev) console.log(`[middleware] token valid — allowing ${pathname} (${(token as any).role || 'user'})`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
