import 'server-only';
/**
 * Ideas repository
 * Spec: spec.md §5.3
 * Owner-scoped: validates event ownership before operations
 */

import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client';
import { ideas, events } from '../schema';

export interface CreateIdeaInput {
  eventId: string;
  ownerId: string;
  kind: string;
  title: string;
  description: string;
  costTier: string;
  categoryKey: string | null;
}

export class IdeasRepository {
  constructor(private db: Database) {}

  /**
   * Create idea
   * Owner-scoped: validates event ownership
   */
  async create(input: CreateIdeaInput) {
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    const [idea] = await this.db
      .insert(ideas)
      .values({
        eventId: input.eventId,
        kind: input.kind,
        title: input.title,
        description: input.description,
        costTier: input.costTier,
        categoryKey: input.categoryKey,
      })
      .returning();

    return idea!;
  }

  /**
   * Get idea by ID
   * Owner-scoped: validates event ownership
   */
  async getById(ideaId: string, ownerId: string) {
    const [idea] = await this.db
      .select({
        idea: ideas,
        event: events,
      })
      .from(ideas)
      .innerJoin(events, eq(ideas.eventId, events.id))
      .where(and(eq(ideas.id, ideaId), eq(events.ownerId, ownerId)))
      .limit(1);

    return idea?.idea ?? null;
  }

  /**
   * List ideas for event
   * Owner-scoped: validates event ownership
   * Ordered by creation date DESC
   */
  async listByEvent(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(ideas)
      .where(eq(ideas.eventId, eventId))
      .orderBy(desc(ideas.createdAt));
  }

  /**
   * Delete idea
   * Owner-scoped: validates event ownership
   */
  async delete(ideaId: string, ownerId: string): Promise<boolean> {
    const idea = await this.getById(ideaId, ownerId);
    if (!idea) return false;

    const result = await this.db
      .delete(ideas)
      .where(eq(ideas.id, ideaId))
      .returning({ id: ideas.id });

    return result.length > 0;
  }

  /**
   * Count ideas for event
   * Owner-scoped: validates event ownership
   */
  async count(eventId: string, ownerId: string): Promise<number | null> {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    const result = await this.db
      .select({ count: this.db.$count(ideas.id) })
      .from(ideas)
      .where(eq(ideas.eventId, eventId));

    return result[0]?.count ?? 0;
  }

  /**
   * Verify event ownership
   */
  private async verifyOwnership(
    eventId: string,
    ownerId: string
  ): Promise<boolean> {
    const [event] = await this.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.ownerId, ownerId)))
      .limit(1);

    return event !== undefined;
  }
}
