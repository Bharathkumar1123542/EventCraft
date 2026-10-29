/**
 * DELETE /api/events/:eventId/ideas/:ideaId - Delete idea
 * Spec: spec.md §8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { IdeasRepository } from '@/server/db/repositories';
import { unauthorized, notFound } from '@/server/http/problem';
import { logRequest, logError } from '@/server/http/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; ideaId: string }> }
) {
  const start = Date.now();
  const { eventId, ideaId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new IdeasRepository(db);
    const deleted = await repo.delete(ideaId, userId);

    if (!deleted) {
      const duration = Date.now() - start;
      logRequest('DELETE', `/api/events/${eventId}/ideas/${ideaId}`, 404, duration, userId);
      return notFound('Idea not found');
    }

    const duration = Date.now() - start;
    logRequest('DELETE', `/api/events/${eventId}/ideas/${ideaId}`, 204, duration, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('DELETE', `/api/events/${eventId}/ideas/${ideaId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to delete idea', error as Error, { eventId, ideaId });
    logRequest('DELETE', `/api/events/${eventId}/ideas/${ideaId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
