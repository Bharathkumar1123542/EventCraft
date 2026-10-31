/**
 * Next.js middleware
 * Spec: spec.md §6.2
 * Enforces authentication on protected routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/api/health',
  '/api/ready',
  '/api/auth',
];

const AUTH_ROUTES = [
  '/sign-in',
  '/sign-up',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('eventcraft.session_token');
  const isAuthenticated = !!sessionCookie;

  // Redirect to sign-in if not authenticated and trying to access protected route
  if (!isAuthenticated && !AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to dashboard if authenticated and trying to access auth routes
  if (isAuthenticated && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
