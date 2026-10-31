/**
 * POST /api/events/:eventId/generate/budget - Suggest budget adjustments
 * Spec: spec.md §9.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { GenerationService } from '@/server/services/generation.service';
import { unauthorized, tooManyRequests, internalServerError } from '@/server/http/problem';
import { RateLimiter } from '@/server/security/rate-limiter';
import { logRequest, logError } from '@/server/http/logger';

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
    const rateCheck = await limiter.check(userId, 'generation:budget_suggest');
    
    if (!rateCheck.allowed) {
      return tooManyRequests(
        `Rate limit exceeded: ${rateCheck.current}/${rateCheck.limit} requests per hour`,
        3600
      );
    }

    // Generate
    const service = new GenerationService(db);
    const suggestion = await service.suggestBudget({
      eventId,
      userId,
    });

    const duration = Date.now() - start;
    logRequest('POST', `/api/events/${eventId}/generate/budget`, 200, duration, userId);

    return NextResponse.json(suggestion);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', `/api/events/${eventId}/generate/budget`, 401, duration);
      return unauthorized();
    }

    logError('Failed to generate budget suggestion', error as Error, { eventId });
    logRequest('POST', `/api/events/${eventId}/generate/budget`, 500, duration);
    
    return internalServerError('Failed to generate budget suggestion');
  }
}
