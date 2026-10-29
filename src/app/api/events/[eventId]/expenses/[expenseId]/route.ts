/**
 * PATCH /api/events/:eventId/expenses/:expenseId - Update expense
 * DELETE /api/events/:eventId/expenses/:expenseId - Delete expense
 * Spec: spec.md §8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { BudgetRepository } from '@/server/db/repositories';
import { updateExpenseSchema } from '@/server/schemas/budget.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText } from '@/server/security/sanitizer';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 10_000; // 10KB

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; expenseId: string }> }
) {
  const start = Date.now();
  const { eventId, expenseId } = await params;

  try {
    const userId = await requireAuth();

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, updateExpenseSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized: typeof input = {};
    
    if (input.label !== undefined) {
      sanitized.label = sanitizeTitle(input.label, 200);
    }
    if (input.notes !== undefined) {
      sanitized.notes = sanitizeText(input.notes, 1000);
    }
    if (input.amountMinor !== undefined) {
      sanitized.amountMinor = input.amountMinor;
    }
    if (input.status !== undefined) {
      sanitized.status = input.status;
    }

    const repo = new BudgetRepository(db);
    const expense = await repo.updateExpense(expenseId, userId, sanitized);

    if (!expense) {
      const duration = Date.now() - start;
      logRequest('PATCH', `/api/events/${eventId}/expenses/${expenseId}`, 404, duration, userId);
      return notFound('Expense not found');
    }

    const duration = Date.now() - start;
    logRequest('PATCH', `/api/events/${eventId}/expenses/${expenseId}`, 200, duration, userId);

    return NextResponse.json(expense);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('PATCH', `/api/events/${eventId}/expenses/${expenseId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to update expense', error as Error, { eventId, expenseId });
    logRequest('PATCH', `/api/events/${eventId}/expenses/${expenseId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; expenseId: string }> }
) {
  const start = Date.now();
  const { eventId, expenseId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new BudgetRepository(db);
    const deleted = await repo.deleteExpense(expenseId, userId);

    if (!deleted) {
      const duration = Date.now() - start;
      logRequest('DELETE', `/api/events/${eventId}/expenses/${expenseId}`, 404, duration, userId);
      return notFound('Expense not found');
    }

    const duration = Date.now() - start;
    logRequest('DELETE', `/api/events/${eventId}/expenses/${expenseId}`, 204, duration, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('DELETE', `/api/events/${eventId}/expenses/${expenseId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to delete expense', error as Error, { eventId, expenseId });
    logRequest('DELETE', `/api/events/${eventId}/expenses/${expenseId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
