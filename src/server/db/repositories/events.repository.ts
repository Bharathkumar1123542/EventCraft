import 'server-only';
/**
 * Events repository
 * Spec: spec.md §5.3
 * Owner-scoped: all queries filter by ownerId
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { events } from '../schema';
import type { EventType, CurrencyCode } from '@/domain/types';

export interface CreateEventInput {
  ownerId: string;
  type: EventType;
  title: string;
  eventDate: string; // IsoDate
  timezone: string;
  city: string | null;
  guestCount: number;
  currency: CurrencyCode;
  totalBudgetMinor: number;
  preferences: Record<string, unknown>;
}

export interface UpdateEventInput {
  title?: string | undefined;
  eventDate?: string | undefined;
  timezone?: string | undefined;
  city?: string | null | undefined;
  guestCount?: number | undefined;
  preferences?: Record<string, unknown> | undefined;
}

export class EventsRepository {
  constructor(private db: Database) {}

  /**
   * Create new event
   * Owner-scoped: sets ownerId
   */
  async create(input: CreateEventInput) {
    const [event] = await this.db
      .insert(events)
      .values({
        ownerId: input.ownerId,
        type: input.type,
        title: input.title,
        eventDate: input.eventDate,
        timezone: input.timezone,
        city: input.city,
        guestCount: input.guestCount,
        currency: input.currency,
        totalBudgetMinor: input.totalBudgetMinor,
        preferences: input.preferences,
      })
      .returning();

    return event!;
  }

  /**
   * Get event by ID
   * Owner-scoped: returns null if not owned by ownerId
   */
  async getById(eventId: string, ownerId: string) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.ownerId, ownerId)))
      .limit(1);

    return event ?? null;
  }

  /**
   * List user's events
   * Owner-scoped: filters by ownerId
   * Ordered by creation date DESC
   */
  async listByOwner(ownerId: string) {
    return this.db
      .select()
      .from(events)
      .where(eq(events.ownerId, ownerId))
      .orderBy(desc(events.createdAt), desc(events.id));
  }

  /**
   * Update event
   * Owner-scoped: returns null if not owned by ownerId
   * Note: cannot update totalBudgetMinor or currency after creation
   */
  async update(eventId: string, ownerId: string, input: UpdateEventInput) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      version: sql`version + 1`,
    };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.eventDate !== undefined) updateData.eventDate = input.eventDate;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.guestCount !== undefined) updateData.guestCount = input.guestCount;
    if (input.preferences !== undefined) updateData.preferences = input.preferences;

    const [updated] = await this.db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, eventId), eq(events.ownerId, ownerId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete event
   * Owner-scoped: deletes only if owned by ownerId
   * Returns true if deleted, false if not found or not owned
   */
  async delete(eventId: string, ownerId: string): Promise<boolean> {
    const result = await this.db
      .delete(events)
      .where(and(eq(events.id, eventId), eq(events.ownerId, ownerId)))
      .returning({ id: events.id });

    return result.length > 0;
  }

  /**
   * Count user's events
   * Owner-scoped: counts only events owned by ownerId
   */
  async countByOwner(ownerId: string): Promise<number> {
    const result = await this.db
      .select({ count: this.db.$count(events.id) })
      .from(events)
      .where(eq(events.ownerId, ownerId));

    return result[0]?.count ?? 0;
  }
}
