/**
 * GET /api/events/:eventId/export/markdown - Export plan as Markdown
 * Spec: spec.md §8.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import type { IsoDate } from '@/domain/types';
import {
  EventsRepository,
  BudgetRepository,
  TasksRepository,
  VendorsRepository,
  IdeasRepository,
} from '@/server/db/repositories';
import { buildPlanMarkdown } from '@/domain/export';
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

    // Get event
    const eventsRepo = new EventsRepository(db);
    const event = await eventsRepo.getById(eventId, userId);

    if (!event) {
      const duration = Date.now() - start;
      logRequest('GET', `/api/events/${eventId}/export/markdown`, 404, duration, userId);
      return notFound('Event not found');
    }

    // Get budget rollup
    const budgetRepo = new BudgetRepository(db);
    const rollup = await budgetRepo.getBudgetRollup(eventId, userId);

    // Get tasks
    const tasksRepo = new TasksRepository(db);
    const tasks = await tasksRepo.listByEvent(eventId, userId);

    // Get vendors
    const vendorsRepo = new VendorsRepository(db);
    const vendors = await vendorsRepo.listByEvent(eventId, userId);

    // Get ideas
    const ideasRepo = new IdeasRepository(db);
    const ideas = await ideasRepo.listByEvent(eventId, userId);

    // Build markdown
    const markdown = buildPlanMarkdown(
      {
        type: event.type,
        title: event.title,
        eventDate: event.eventDate as IsoDate,
        guestCount: event.guestCount,
        city: event.city,
      },
      rollup?.map((r) => ({
        label: r.categoryKey,
        allocatedMinor: r.allocatedMinor,
        committedMinor: r.committedMinor,
        paidMinor: r.paidMinor,
        remainingMinor: r.remainingMinor,
        status:
          r.remainingMinor < 0
            ? 'over'
            : r.remainingMinor < r.allocatedMinor * 0.1
              ? 'near_limit'
              : 'ok',
      })) ?? [],
      tasks?.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
      })) ?? [],
      vendors?.map((v) => ({
        need: v.need,
        questions: v.questions as string[],
        isMustHave: v.isMustHave,
      })) ?? [],
      ideas?.map((i) => ({
        title: i.title,
        description: i.description,
      })) ?? [],
      event.currency
    );

    const duration = Date.now() - start;
    logRequest('GET', `/api/events/${eventId}/export/markdown`, 200, duration, userId);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="event-${eventId}.md"`,
      },
    });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('GET', `/api/events/${eventId}/export/markdown`, 401, duration);
      return unauthorized();
    }

    logError('Failed to export markdown', error as Error, { eventId });
    logRequest('GET', `/api/events/${eventId}/export/markdown`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
