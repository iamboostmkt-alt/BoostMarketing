import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const isDev = process.env.NODE_ENV === 'development';

function isAdminRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/admin' ||
    pathname.startsWith('/dashboard/admin/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (isDev) {
      console.log(`[middleware] no token — redirecting ${pathname} → /login`);
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname) && token.role !== 'ADMIN') {
    if (isDev) {
      console.log(
        `[middleware] forbidden admin route — ${pathname} (role=${token.role})`
      );
    }
    const dash = new URL('/dashboard', request.url);
    dash.searchParams.set('forbidden', 'admin');
    return NextResponse.redirect(dash);
  }

  if (isDev) {
    console.log(
      `[middleware] allow ${pathname} (${String(token.role ?? 'user')})`
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
