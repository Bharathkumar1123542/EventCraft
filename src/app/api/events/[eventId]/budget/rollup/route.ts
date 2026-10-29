/**
 * GET /api/events/:eventId/budget/rollup - Get budget rollup
 * Spec: spec.md §8.2
 * Returns allocated, committed, paid, remaining per category
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { BudgetRepository } from '@/server/db/repositories';
import { unauthorized, notFound } from '@/server/http/problem';
import { logRequest, logError } from '@/server/http/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new BudgetRepository(db);
    const rollup = await repo.getBudgetRollup(eventId, userId);

    if (!rollup) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/budget/rollup`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/budget/rollup`, 200, duration, userId);

    return NextResponse.json({ rollup });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/budget/rollup`, 401, duration);
      return unauthorized();
    }

    logError('Failed to get budget rollup', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/budget/rollup`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
