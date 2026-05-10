import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { canAccessRoute } from '@/lib/roles';

const isDev = process.env.NODE_ENV === 'development';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → redirect to login
  if (!token) {
    if (isDev) {
      console.log(`[middleware] no token — redirecting ${pathname} → /login`);
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Role-based route access check
  if (!canAccessRoute(pathname, role)) {
    if (isDev) {
      console.log(
        `[middleware] forbidden — ${pathname} (role=${role ?? 'undefined'})`
      );
    }
    const dash = new URL('/dashboard', request.url);
    dash.searchParams.set('forbidden', '1');
    return NextResponse.redirect(dash);
  }

  if (isDev) {
    console.log(`[middleware] allow ${pathname} (${String(role ?? 'user')})`);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
