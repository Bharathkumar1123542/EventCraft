/**
 * POST /api/events/:eventId/ideas - Create idea
 * GET /api/events/:eventId/ideas - List ideas
 * Spec: spec.md §8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { IdeasRepository } from '@/server/db/repositories';
import { createIdeaSchema } from '@/server/schemas/ideas.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest, tooManyRequests } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText, sanitizeString } from '@/server/security/sanitizer';
import { RateLimiter } from '@/server/security/rate-limiter';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 10_000; // 10KB

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
    const rateCheck = await limiter.check(userId, 'api:create_idea');
    
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

    const result = await parseBody(request, createIdeaSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized = {
      ...input,
      kind: sanitizeString(input.kind, 50),
      title: sanitizeTitle(input.title, 200),
      description: sanitizeText(input.description, 1000),
      costTier: sanitizeString(input.costTier, 20),
    };

    const repo = new IdeasRepository(db);
    const idea = await repo.create({
      eventId,
      ownerId: userId,
      kind: sanitized.kind,
      title: sanitized.title,
      description: sanitized.description,
      costTier: sanitized.costTier,
      categoryKey: sanitized.categoryKey,
    });

    if (!idea) {
      const duration = Date.now() - start;
      logRequest('POST', `/api/events/${eventId}/ideas`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('POST', `/api/events/${eventId}/ideas`, 201, duration, userId);

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', `/api/events/${eventId}/ideas`, 401, duration);
      return unauthorized();
    }

    logError('Failed to create idea', error as Error, { eventId });
    logRequest('POST', `/api/events/${eventId}/ideas`, 500, duration);
    
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

    const repo = new IdeasRepository(db);
    const ideas = await repo.listByEvent(eventId, userId);

    if (!ideas) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/ideas`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/ideas`, 200, duration, userId);

    return NextResponse.json({ ideas });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/ideas`, 401, duration);
      return unauthorized();
    }

    logError('Failed to list ideas', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/ideas`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
