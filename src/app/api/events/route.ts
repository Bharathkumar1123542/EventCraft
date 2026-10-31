/**
 * POST /api/events - Create event
 * GET /api/events - List user's events
 * Spec: spec.md §8.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { EventsRepository } from '@/server/db/repositories';
import { createEventSchema } from '@/server/schemas/events.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, badRequest, tooManyRequests } from '@/server/http/problem';
import { sanitizeTitle, sanitizeString, sanitizeText } from '@/server/security/sanitizer';
import { RateLimiter } from '@/server/security/rate-limiter';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 50_000; // 50KB

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    // Auth
    const userId = await requireAuth();

    // Rate limit
    const limiter = new RateLimiter(db);
    const rateCheck = await limiter.check(userId, 'api:create_event');
    
    if (!rateCheck.allowed) {
      return tooManyRequests(
        `Rate limit exceeded: ${rateCheck.current}/${rateCheck.limit} requests`,
        60
      );
    }

    // Content-Type check
    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    // Size check
    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    // Parse and validate
    const result = await parseBody(request, createEventSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize inputs
    const sanitized = {
      ...input,
      title: sanitizeTitle(input.title, 200),
      city: input.city ? sanitizeString(input.city, 200) : null,
      timezone: sanitizeString(input.timezone, 100),
      preferences: input.preferences ?? {},
    };

    // Create event
    const repo = new EventsRepository(db);
    const event = await repo.create({
      ownerId: userId,
      type: sanitized.type,
      title: sanitized.title,
      eventDate: sanitized.eventDate,
      timezone: sanitized.timezone,
      city: sanitized.city,
      guestCount: sanitized.guestCount,
      currency: sanitized.currency,
      totalBudgetMinor: sanitized.totalBudgetMinor,
      preferences: sanitized.preferences,
    });

    const duration = Date.now() - start;
    logRequest('POST', '/api/events', 201, duration, userId);

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', '/api/events', 401, duration);
      return unauthorized();
    }

    logError('Failed to create event', error as Error);
    logRequest('POST', '/api/events', 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    // Auth
    const userId = await requireAuth();

    // List events
    const repo = new EventsRepository(db);
    const events = await repo.listByOwner(userId);

    const duration = Date.now() - start;
    logRequest('GET', '/api/events', 200, duration, userId);

    return NextResponse.json({ events });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', '/api/events', 401, duration);
      return unauthorized();
    }

    logError('Failed to list events', error as Error);
    logRequest('GET', '/api/events', 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
