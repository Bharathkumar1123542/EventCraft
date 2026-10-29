import 'server-only';
/**
 * RFC 9457 Problem Details responses
 * Spec: spec.md §6.3
 */

import { NextResponse } from 'next/server';

export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

/**
 * Create Problem Details JSON response
 */
export function problemResponse(problem: ProblemDetail): NextResponse {
  return NextResponse.json(problem, {
    status: problem.status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

/**
 * Standard problem responses
 */

export function badRequest(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    detail,
  });
}

export function unauthorized(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Unauthorized',
    status: 401,
    detail: detail ?? 'Authentication required',
  });
}

export function forbidden(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Forbidden',
    status: 403,
    detail: detail ?? 'Access denied',
  });
}

export function notFound(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Not Found',
    status: 404,
    detail,
  });
}

export function conflict(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Conflict',
    status: 409,
    detail,
  });
}

export function unprocessableEntity(detail?: string, errors?: unknown): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Unprocessable Entity',
    status: 422,
    detail,
    errors,
  });
}

export function tooManyRequests(detail?: string, retryAfter?: number): NextResponse {
  const response = problemResponse({
    type: 'about:blank',
    title: 'Too Many Requests',
    status: 429,
    detail: detail ?? 'Rate limit exceeded',
  });

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }

  return response;
}

export function internalServerError(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: detail ?? 'An unexpected error occurred',
  });
}

export function serviceUnavailable(detail?: string): NextResponse {
  return problemResponse({
    type: 'about:blank',
    title: 'Service Unavailable',
    status: 503,
    detail,
  });
}
