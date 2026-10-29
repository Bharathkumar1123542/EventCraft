import 'server-only';
/**
 * Vendors repository
 * Spec: spec.md §5.3
 * Owner-scoped: validates event ownership before operations
 */

import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client';
import { vendors, events } from '../schema';
import type { CategoryKey } from '@/domain/types';

export interface CreateVendorInput {
  eventId: string;
  ownerId: string;
  categoryKey: CategoryKey;
  need: string;
  questions: readonly string[];
  isMustHave: boolean;
  notes?: string | undefined;
}

export interface UpdateVendorInput {
  need?: string | undefined;
  questions?: readonly string[] | undefined;
  status?: 'not_started' | 'contacted' | 'quoted' | 'booked' | 'declined' | undefined;
  isMustHave?: boolean | undefined;
  notes?: string | undefined;
}

export class VendorsRepository {
  constructor(private db: Database) {}

  /**
   * Create vendor
   * Owner-scoped: validates event ownership
   */
  async create(input: CreateVendorInput) {
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    const [vendor] = await this.db
      .insert(vendors)
      .values({
        eventId: input.eventId,
        categoryKey: input.categoryKey,
        need: input.need,
        questions: input.questions as string[],
        isMustHave: input.isMustHave,
        ...(input.notes !== undefined && { notes: input.notes }),
      })
      .returning();

    return vendor!;
  }

  /**
   * Get vendor by ID
   * Owner-scoped: validates event ownership
   */
  async getById(vendorId: string, ownerId: string) {
    const [vendor] = await this.db
      .select({
        vendor: vendors,
        event: events,
      })
      .from(vendors)
      .innerJoin(events, eq(vendors.eventId, events.id))
      .where(and(eq(vendors.id, vendorId), eq(events.ownerId, ownerId)))
      .limit(1);

    return vendor?.vendor ?? null;
  }

  /**
   * List vendors for event
   * Owner-scoped: validates event ownership
   */
  async listByEvent(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(vendors)
      .where(eq(vendors.eventId, eventId))
      .orderBy(desc(vendors.createdAt));
  }

  /**
   * Update vendor
   * Owner-scoped: validates event ownership
   */
  async update(vendorId: string, ownerId: string, input: UpdateVendorInput) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (input.need !== undefined) updateData.need = input.need;
    if (input.questions !== undefined) updateData.questions = input.questions as string[];
    if (input.status !== undefined) updateData.status = input.status;
    if (input.isMustHave !== undefined) updateData.isMustHave = input.isMustHave;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const [updated] = await this.db
      .update(vendors)
      .set(updateData)
      .where(
        and(
          eq(vendors.id, vendorId),
          eq(
            vendors.eventId,
            this.db
              .select({ id: events.id })
              .from(events)
              .where(eq(events.ownerId, ownerId))
          )
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Delete vendor
   * Owner-scoped: validates event ownership
   */
  async delete(vendorId: string, ownerId: string): Promise<boolean> {
    const vendor = await this.getById(vendorId, ownerId);
    if (!vendor) return false;

    const result = await this.db
      .delete(vendors)
      .where(eq(vendors.id, vendorId))
      .returning({ id: vendors.id });

    return result.length > 0;
  }

  /**
   * Count vendors by status
   * Owner-scoped: validates event ownership
   */
  async countByStatus(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    const vendorsList = await this.db
      .select()
      .from(vendors)
      .where(eq(vendors.eventId, eventId));

    return vendorsList.reduce(
      (acc, v) => {
        acc[v.status] = (acc[v.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
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
