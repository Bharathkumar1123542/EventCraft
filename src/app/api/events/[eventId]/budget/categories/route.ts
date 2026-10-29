/**
 * PUT /api/events/:eventId/budget/categories - Set budget categories
 * GET /api/events/:eventId/budget/categories - Get budget categories
 * Spec: spec.md §8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { BudgetRepository } from '@/server/db/repositories';
import { setCategoriesSchema } from '@/server/schemas/budget.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest } from '@/server/http/problem';
import { logRequest, logError } from '@/server/http/logger';
import type { CategoryKey } from '@/domain/types';

const MAX_BODY_SIZE = 10_000; // 10KB

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;
  let userId: string | undefined;

  try {
    userId = await requireAuth();

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, setCategoriesSchema);
    
    if (!result.success) {
      return result.error;
    }

    const repo = new BudgetRepository(db);
    const categories = await repo.setCategories({
      eventId,
      ownerId: userId,
      categories: result.data.categories as Array<{
        categoryKey: CategoryKey;
        allocatedMinor: number;
      }>,
    });

    if (!categories) {
      const duration = Date.now() - start;
      logRequest('PUT', `/api/events/${eventId}/budget/categories`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('PUT', `/api/events/${eventId}/budget/categories`, 200, duration, userId);

    return NextResponse.json({ categories });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('PUT', `/api/events/${eventId}/budget/categories`, 401, duration);
      return unauthorized();
    }

    // Budget sum violation from trigger
    if (error instanceof Error && error.message.includes('Budget sum violation')) {
      logRequest('PUT', `/api/events/${eventId}/budget/categories`, 400, duration, userId);
      return badRequest('Budget categories must sum to event total budget');
    }

    logError('Failed to set budget categories', error as Error, { eventId });
    logRequest('PUT', `/api/events/${eventId}/budget/categories`, 500, duration);
    
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

    const repo = new BudgetRepository(db);
    const categories = await repo.getCategories(eventId, userId);

    if (!categories) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/budget/categories`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/budget/categories`, 200, duration, userId);

    return NextResponse.json({ categories });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/budget/categories`, 401, duration);
      return unauthorized();
    }

    logError('Failed to get budget categories', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/budget/categories`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
