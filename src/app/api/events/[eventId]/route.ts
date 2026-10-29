/**
 * GET /api/events/:eventId - Get event by ID
 * PATCH /api/events/:eventId - Update event
 * DELETE /api/events/:eventId - Delete event
 * Spec: spec.md §8.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { EventsRepository } from '@/server/db/repositories';
import { updateEventSchema } from '@/server/schemas/events.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest } from '@/server/http/problem';
import { sanitizeTitle, sanitizeString } from '@/server/security/sanitizer';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 50_000; // 50KB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new EventsRepository(db);
    const event = await repo.getById(eventId, userId);

    if (!event) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}`, 200, duration, userId);

    return NextResponse.json(event);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to get event', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    // Content-Type check
    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    // Size check
    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    // Parse and validate
    const result = await parseBody(request, updateEventSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize inputs
    const sanitized: typeof input = {};
    
    if (input.title !== undefined) {
      sanitized.title = sanitizeTitle(input.title, 200);
    }
    if (input.city !== undefined) {
      sanitized.city = input.city ? sanitizeString(input.city, 200) : null;
    }
    if (input.timezone !== undefined) {
      sanitized.timezone = sanitizeString(input.timezone, 100);
    }
    if (input.eventDate !== undefined) {
      sanitized.eventDate = input.eventDate;
    }
    if (input.guestCount !== undefined) {
      sanitized.guestCount = input.guestCount;
    }
    if (input.preferences !== undefined) {
      sanitized.preferences = input.preferences;
    }

    // Update event
    const repo = new EventsRepository(db);
    const event = await repo.update(eventId, userId, sanitized);

    if (!event) {
      const duration = Date.now() - start;
      logRequest('PATCH', `/api/events/${eventId}`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('PATCH', `/api/events/${eventId}`, 200, duration, userId);

    return NextResponse.json(event);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('PATCH', `/api/events/${eventId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to update event', error as Error, { eventId });
    logRequest('PATCH', `/api/events/${eventId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const start = Date.now();
  const { eventId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new EventsRepository(db);
    const deleted = await repo.delete(eventId, userId);

    if (!deleted) {
      const duration = Date.now() - start;
      logRequest('DELETE', `/api/events/${eventId}`, 404, duration, userId);
      return notFound('Event not found');
    }

    const duration = Date.now() - start;
    logRequest('DELETE', `/api/events/${eventId}`, 204, duration, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('DELETE', `/api/events/${eventId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to delete event', error as Error, { eventId });
    logRequest('DELETE', `/api/events/${eventId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
