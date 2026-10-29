import 'server-only';
/**
 * Rate limiting and usage tracking repository
 * Spec: spec.md §5.3, §7.3
 */

import { eq, and, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { rateLimits, usageCounters } from '../schema';

export class SecurityRepository {
  constructor(private db: Database) {}

  /**
   * Check rate limit
   * Returns current count if under limit, null if over limit
   */
  async checkRateLimit(
    userId: string,
    bucket: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; current: number }> {
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / windowMs) * windowMs
    );
    const expiresAt = new Date(windowStart.getTime() + windowMs);

    // Try to get existing counter
    const [existing] = await this.db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.userId, userId),
          eq(rateLimits.bucket, bucket),
          eq(rateLimits.windowStart, windowStart)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.count >= limit) {
        return { allowed: false, current: existing.count };
      }

      // Increment counter
      const [updated] = await this.db
        .update(rateLimits)
        .set({ count: existing.count + 1 })
        .where(
          and(
            eq(rateLimits.userId, userId),
            eq(rateLimits.bucket, bucket),
            eq(rateLimits.windowStart, windowStart)
          )
        )
        .returning();

      return { allowed: true, current: updated!.count };
    }

    // Create new counter
    const [created] = await this.db
      .insert(rateLimits)
      .values({
        userId,
        bucket,
        count: 1,
        windowStart,
        expiresAt,
      })
      .returning();

    return { allowed: true, current: created!.count };
  }

  /**
   * Clean up expired rate limit entries
   * Should be called periodically
   */
  async cleanupExpiredRateLimits(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .delete(rateLimits)
      .where(lt(rateLimits.expiresAt, now))
      .returning({ id: rateLimits.userId });

    return result.length;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(userId: string, metric: string, amount = 1) {
    const [existing] = await this.db
      .select()
      .from(usageCounters)
      .where(
        and(eq(usageCounters.userId, userId), eq(usageCounters.metric, metric))
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(usageCounters)
        .set({
          value: existing.value + amount,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usageCounters.userId, userId),
            eq(usageCounters.metric, metric)
          )
        )
        .returning();

      return updated!;
    }

    const [created] = await this.db
      .insert(usageCounters)
      .values({
        userId,
        metric,
        value: amount,
      })
      .returning();

    return created!;
  }

  /**
   * Get usage counter
   */
  async getUsage(userId: string, metric: string): Promise<number> {
    const [counter] = await this.db
      .select()
      .from(usageCounters)
      .where(
        and(eq(usageCounters.userId, userId), eq(usageCounters.metric, metric))
      )
      .limit(1);

    return counter?.value ?? 0;
  }

  /**
   * Get all usage counters for user
   */
  async getAllUsage(userId: string) {
    return this.db
      .select()
      .from(usageCounters)
      .where(eq(usageCounters.userId, userId));
  }
}
