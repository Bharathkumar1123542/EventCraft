/**
 * GET /api/events/:eventId/export/ics - Export tasks as ICS calendar
 * Spec: spec.md §8.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { TasksRepository } from '@/server/db/repositories';
import { buildIcs } from '@/domain/ics';
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

    // Get tasks
    const tasksRepo = new TasksRepository(db);
    const tasks = await tasksRepo.listByEvent(eventId, userId);

    if (!tasks) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/export/ics`, 404, duration, userId);
      return notFound('Event not found');
    }

    // Build ICS
    const events = tasks.map((task) => ({
      uid: `task-${task.id}`,
      summary: task.title,
      date: task.dueDate,
    }));

    const ics = buildIcs(events, new Date());

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/export/ics`, 200, duration, userId);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
      },
    });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/export/ics`, 401, duration);
      return unauthorized();
    }

    logError('Failed to export ICS', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/export/ics`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
