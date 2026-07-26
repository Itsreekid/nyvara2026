import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes only admins can visit
const ADMIN_ONLY = ['/admin/products', '/admin/categories', '/admin/employees'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/admin/login';

  let response = NextResponse.next();

  if (isAdminRoute) {
    const role = request.cookies.get('nyvara_admin_session')?.value;

    // ── Not logged in ──────────────────────────────────────────────────────
    if (!role) {
      if (!isLoginRoute) response = NextResponse.redirect(new URL('/admin/login', request.url));
    }
    // ── Already logged in, skip login page ────────────────────────────────
    else if (isLoginRoute) {
      const dest = role === 'admin' ? '/admin' : '/admin/orders';
      response = NextResponse.redirect(new URL(dest, request.url));
    }
    // ── Employee trying to reach admin-only routes ─────────────────────────
    else if (role === 'employee') {
      const isDashboard  = pathname === '/admin';
      const isProtectedAdmin = ADMIN_ONLY.some(p => pathname.startsWith(p));
      if (isDashboard || isProtectedAdmin) {
        response = NextResponse.redirect(new URL('/admin/orders', request.url));
      }
    }
  }

  // Set first-party guest tracking cookie
  if (!request.cookies.has('nyvara_guest_id')) {
    const guestId = crypto.randomUUID();
    response.cookies.set('nyvara_guest_id', guestId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 Year
      sameSite: 'lax',
      httpOnly: false, // For client-side Meta Pixel SDK
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
