/**
 * POST /api/events/:eventId/vendors - Create vendor
 * GET /api/events/:eventId/vendors - List vendors
 * Spec: spec.md §8.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { VendorsRepository } from '@/server/db/repositories';
import { createVendorSchema } from '@/server/schemas/vendors.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest, tooManyRequests } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText, sanitizeStringArray } from '@/server/security/sanitizer';
import { RateLimiter } from '@/server/security/rate-limiter';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 20_000; // 20KB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    // Rate limit
    const limiter = new RateLimiter(db);
    const rateCheck = await limiter.check(userId, 'api:create_vendor');
    
    if (!rateCheck.allowed) {
      return tooManyRequests(
        `Rate limit exceeded: ${rateCheck.current}/${rateCheck.limit} requests`,
        60
      );
    }

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, createVendorSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized = {
      ...input,
      need: sanitizeTitle(input.need, 200),
      questions: sanitizeStringArray(input.questions, 20, 500),
      notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
    };

    const repo = new VendorsRepository(db);
    const vendor = await repo.create({
      eventId,
      ownerId: userId,
      categoryKey: sanitized.categoryKey,
      need: sanitized.need,
      questions: sanitized.questions,
      isMustHave: sanitized.isMustHave,
      notes: sanitized.notes,
    });

    if (!vendor) {
      const duration = Date.now() - start;
      logRequest('POST', `/api/events/${eventId}/vendors`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('POST', `/api/events/${eventId}/vendors`, 201, duration, userId);

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', `/api/events/${eventId}/vendors`, 401, duration);
      return unauthorized();
    }

    logError('Failed to create vendor', error as Error, { eventId });
    logRequest('POST', `/api/events/${eventId}/vendors`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new VendorsRepository(db);
    const vendors = await repo.listByEvent(eventId, userId);

    if (!vendors) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/vendors`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/vendors`, 200, duration, userId);

    return NextResponse.json({ vendors });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/vendors`, 401, duration);
      return unauthorized();
    }

    logError('Failed to list vendors', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/vendors`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
