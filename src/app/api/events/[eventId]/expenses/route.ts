/**
 * POST /api/events/:eventId/expenses - Create expense
 * GET /api/events/:eventId/expenses - List expenses
 * Spec: spec.md §8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { BudgetRepository } from '@/server/db/repositories';
import { createExpenseSchema } from '@/server/schemas/budget.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest, tooManyRequests } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText } from '@/server/security/sanitizer';
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
    const rateCheck = await limiter.check(userId, 'api:create_expense');
    
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

    const result = await parseBody(request, createExpenseSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized = {
      ...input,
      label: sanitizeTitle(input.label, 200),
      notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
    };

    const repo = new BudgetRepository(db);
    const expense = await repo.createExpense({
      eventId,
      ownerId: userId,
      categoryKey: sanitized.categoryKey,
      label: sanitized.label,
      amountMinor: sanitized.amountMinor,
      status: sanitized.status,
      notes: sanitized.notes,
    });

    if (!expense) {
      const duration = Date.now() - start;
      logRequest('POST', `/api/events/${eventId}/expenses`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('POST', `/api/events/${eventId}/expenses`, 201, duration, userId);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', `/api/events/${eventId}/expenses`, 401, duration);
      return unauthorized();
    }

    logError('Failed to create expense', error as Error, { eventId });
    logRequest('POST', `/api/events/${eventId}/expenses`, 500, duration);
    
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
    const expenses = await repo.listExpenses(eventId, userId);

    if (!expenses) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/expenses`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/expenses`, 200, duration, userId);

    return NextResponse.json({ expenses });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/expenses`, 401, duration);
      return unauthorized();
    }

    logError('Failed to list expenses', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/expenses`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
