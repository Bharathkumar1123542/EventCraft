/**
 * PATCH /api/events/:eventId/tasks/:taskId - Update task
 * DELETE /api/events/:eventId/tasks/:taskId - Delete task
 * Spec: spec.md §8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { TasksRepository } from '@/server/db/repositories';
import { updateTaskSchema } from '@/server/schemas/tasks.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText } from '@/server/security/sanitizer';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 10_000; // 10KB

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; taskId: string }> }
) {
  const start = Date.now();
  const { eventId, taskId } = await params;

  try {
    const userId = await requireAuth();

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, updateTaskSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized: typeof input = {};
    
    if (input.title !== undefined) {
      sanitized.title = sanitizeTitle(input.title, 200);
    }
    if (input.notes !== undefined) {
      sanitized.notes = sanitizeText(input.notes, 1000);
    }
    if (input.categoryKey !== undefined) {
      sanitized.categoryKey = input.categoryKey;
    }
    if (input.dueDate !== undefined) {
      sanitized.dueDate = input.dueDate;
    }
    if (input.priority !== undefined) {
      sanitized.priority = input.priority;
    }
    if (input.status !== undefined) {
      sanitized.status = input.status;
    }

    const repo = new TasksRepository(db);
    const task = await repo.update(taskId, userId, sanitized);

    if (!task) {
      const duration = Date.now() - start;
      logRequest('PATCH', `/api/events/${eventId}/tasks/${taskId}`, 404, duration, userId);
      return notFound('Task not found');
    }

    const duration = Date.now() - start;
    logRequest('PATCH', `/api/events/${eventId}/tasks/${taskId}`, 200, duration, userId);

    return NextResponse.json(task);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('PATCH', `/api/events/${eventId}/tasks/${taskId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to update task', error as Error, { eventId, taskId });
    logRequest('PATCH', `/api/events/${eventId}/tasks/${taskId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; taskId: string }> }
) {
  const start = Date.now();
  const { eventId, taskId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new TasksRepository(db);
    const deleted = await repo.delete(taskId, userId);

    if (!deleted) {
      const duration = Date.now() - start;
      logRequest('DELETE', `/api/events/${eventId}/tasks/${taskId}`, 404, duration, userId);
      return notFound('Task not found');
    }

    const duration = Date.now() - start;
    logRequest('DELETE', `/api/events/${eventId}/tasks/${taskId}`, 204, duration, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('DELETE', `/api/events/${eventId}/tasks/${taskId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to delete task', error as Error, { eventId, taskId });
    logRequest('DELETE', `/api/events/${eventId}/tasks/${taskId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
