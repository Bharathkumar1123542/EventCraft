/**
 * POST /api/generate/initial-plan - Generate initial event plan
 * Spec: spec.md §9.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { GenerationService } from '@/server/services/generation.service';
import { generateInitialPlanSchema } from '@/server/schemas/generation.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, badRequest, tooManyRequests, internalServerError } from '@/server/http/problem';
import { sanitizeString, sanitizeText } from '@/server/security/sanitizer';
import { RateLimiter } from '@/server/security/rate-limiter';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 10_000; // 10KB

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const userId = await requireAuth();

    // Rate limit
    const limiter = new RateLimiter(db);
    const rateCheck = await limiter.check(userId, 'generation:initial_plan');
    
    if (!rateCheck.allowed) {
      return tooManyRequests(
        `Rate limit exceeded: ${rateCheck.current}/${rateCheck.limit} requests per hour`,
        3600
      );
    }

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, generateInitialPlanSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized = {
      ...input,
      city: input.city ? sanitizeString(input.city, 200) : null,
      timezone: sanitizeString(input.timezone, 100),
      userPrompt: sanitizeText(input.userPrompt, 2000),
      preferences: input.preferences ?? {},
    };

    // Generate
    const service = new GenerationService(db);
    const generationResult = await service.generateInitialPlan({
      userId,
      ...sanitized,
    });

    const duration = Date.now() - start;
    logRequest('POST', '/api/generate/initial-plan', 201, duration, userId);

    return NextResponse.json(generationResult, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', '/api/generate/initial-plan', 401, duration);
      return unauthorized();
    }

    logError('Failed to generate initial plan', error as Error);
    logRequest('POST', '/api/generate/initial-plan', 500, duration);
    
    return internalServerError('Failed to generate plan');
  }
}
