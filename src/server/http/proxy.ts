import 'server-only';
/**
 * HTTP proxy middleware
 * Spec: spec.md §6.2
 * Security headers, CSP nonce, Origin check
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '../config/env';

/**
 * Generate CSP nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Build Content-Security-Policy header with nonce
 */
export function buildCsp(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  return directives.join('; ');
}

/**
 * Verify Origin header for state-changing requests
 */
export function verifyOrigin(request: NextRequest): boolean {
  const method = request.method;
  
  // Only check state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // If no origin header, check referer
  if (!origin) {
    const referer = request.headers.get('referer');
    if (!referer) {
      return false;
    }

    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // Verify origin matches host
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  nonce?: string
): NextResponse {
  const headers = response.headers;

  // CSP with nonce
  if (nonce) {
    headers.set('Content-Security-Policy', buildCsp(nonce));
  }

  // Security headers per spec.md §6.2
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS in production
  if (env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}
