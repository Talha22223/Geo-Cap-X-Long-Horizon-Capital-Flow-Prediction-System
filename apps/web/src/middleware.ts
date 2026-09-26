/**
 * ============================================================================
 * NEXT.JS EDGE ROUTE PROTECTION MIDDLEWARE (middleware.ts)
 * ============================================================================
 * WHAT:
 *   Edge-level route interceptor executing before Next.js page rendering:
 *   1. Protects institutional routes (`/dashboard`, `/predictions`, `/market`, etc.)
 *      by checking for `geocapx_auth_token` or `accessToken` cookies.
 *   2. Redirects unauthenticated visitors to `/login?redirect=<path>`.
 *   3. Redirects authenticated visitors away from auth pages (`/login`, `/register`) to `/dashboard`.
 *   4. Injects strict `Cache-Control: no-store` headers on protected pages to prevent
 *      back-forward cache (bfcache) leaks after logout.
 *
 * WHY:
 *   Provides instant, zero-flicker edge authentication enforcement before frontend
 *   React code is even delivered to the browser.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected path prefixes requiring authenticated session
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/flows',
  '/market',
  '/predictions',
  '/events',
  '/reports',
  '/visualizations',
  '/technical',
  '/validation',
  '/watchlist',
  '/news',
  '/settings',
  '/billing',
  '/support',
];

// Authentication-only pages (redirect logged-in users away from here)
const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve auth token from cookies
  const authToken =
    request.cookies.get('geocapx_auth_token')?.value ||
    request.cookies.get('accessToken')?.value;

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAuthPage = AUTH_PAGES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 1. Unauthenticated user trying to access protected dashboard routes
  if (isProtectedPath && !authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    // Ensure no caching of redirect response
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  }

  // 2. Already authenticated user visiting login or register
  if (isAuthPage && authToken) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. For protected routes, disable browser caching to prevent bfcache leaks after logout
  const response = NextResponse.next();
  if (isProtectedPath) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
