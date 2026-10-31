/**
 * POST /api/events/:eventId/tasks - Create task
 * GET /api/events/:eventId/tasks - List tasks
 * Spec: spec.md §8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { TasksRepository } from '@/server/db/repositories';
import type { CategoryKey } from '@/domain/types';
import { createTaskSchema } from '@/server/schemas/tasks.schema';
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
    const rateCheck = await limiter.check(userId, 'api:create_task');
    
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

    const result = await parseBody(request, createTaskSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized = {
      ...input,
      title: sanitizeTitle(input.title, 200),
      notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
    };

    const repo = new TasksRepository(db);
    const task = await repo.create({
      eventId,
      ownerId: userId,
      title: sanitized.title,
      categoryKey: sanitized.categoryKey as CategoryKey | null,
      dueDate: sanitized.dueDate,
      priority: sanitized.priority,
      notes: sanitized.notes,
    });

    if (!task) {
      const duration = Date.now() - start;
      logRequest('POST', `/api/events/${eventId}/tasks`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('POST', `/api/events/${eventId}/tasks`, 201, duration, userId);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('POST', `/api/events/${eventId}/tasks`, 401, duration);
      return unauthorized();
    }

    logError('Failed to create task', error as Error, { eventId });
    logRequest('POST', `/api/events/${eventId}/tasks`, 500, duration);
    
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

    const repo = new TasksRepository(db);
    const tasks = await repo.listByEvent(eventId, userId);

    if (!tasks) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/tasks`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/tasks`, 200, duration, userId);

    return NextResponse.json({ tasks });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/tasks`, 401, duration);
      return unauthorized();
    }

    logError('Failed to list tasks', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/tasks`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
