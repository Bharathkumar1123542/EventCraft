import 'server-only';
/**
 * Request validation helpers
 * Spec: spec.md §6.3
 */

import { ZodSchema, ZodError } from 'zod';
import { badRequest, unprocessableEntity } from './problem';
import type { NextRequest } from 'next/server';

/**
 * Parse and validate JSON body
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ReturnType<typeof unprocessableEntity> }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: unprocessableEntity(
          'Validation failed',
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        ),
      };
    }

    return {
      success: false,
      error: badRequest('Invalid JSON'),
    };
  }
}

/**
 * Parse and validate query parameters
 */
export function parseQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: ReturnType<typeof unprocessableEntity> } {
  try {
    const { searchParams } = request.nextUrl;
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: unprocessableEntity(
          'Invalid query parameters',
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        ),
      };
    }

    return {
      success: false,
      error: badRequest('Invalid query parameters'),
    };
  }
}

/**
 * Validate content-type header
 */
export function requireJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type');
  return contentType?.includes('application/json') ?? false;
}

/**
 * Check request body size
 * Returns true if size is acceptable
 */
export function checkBodySize(request: NextRequest, maxBytes: number): boolean {
  const contentLength = request.headers.get('content-length');
  
  if (!contentLength) {
    return true; // Can't verify, let it through
  }

  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxBytes;
}
