import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes only admins can visit
const ADMIN_ONLY = ['/admin/products', '/admin/categories', '/admin/employees'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/admin/login';

  if (!isAdminRoute) return NextResponse.next();

  const role = request.cookies.get('nyvara_admin_session')?.value;

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!role) {
    if (isLoginRoute) return NextResponse.next();
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // ── Already logged in, skip login page ────────────────────────────────
  if (isLoginRoute) {
    const dest = role === 'admin' ? '/admin' : '/admin/orders';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Employee trying to reach admin-only routes ─────────────────────────
  if (role === 'employee') {
    const isDashboard  = pathname === '/admin';
    const isAdminRoute = ADMIN_ONLY.some(p => pathname.startsWith(p));
    if (isDashboard || isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/orders', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
