import 'server-only';
/**
 * Rate limiter
 * Spec: spec.md §7.3
 */

import { SecurityRepository } from '../db/repositories/security.repository';
import type { Database } from '../db/client';

export type RateLimitBucket =
  | 'generation:initial_plan'
  | 'generation:budget_suggest'
  | 'generation:task_suggest'
  | 'generation:vendor_suggest'
  | 'generation:idea_suggest'
  | 'generation:chat'
  | 'api:create_event'
  | 'api:create_expense'
  | 'api:create_task'
  | 'api:create_vendor'
  | 'api:create_idea';

/**
 * Rate limits per bucket (requests per window)
 * Spec: spec.md §7.3
 */
const LIMITS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  'generation:initial_plan': { limit: 5, windowMs: 3600_000 }, // 5 per hour
  'generation:budget_suggest': { limit: 20, windowMs: 3600_000 }, // 20 per hour
  'generation:task_suggest': { limit: 20, windowMs: 3600_000 },
  'generation:vendor_suggest': { limit: 20, windowMs: 3600_000 },
  'generation:idea_suggest': { limit: 20, windowMs: 3600_000 },
  'generation:chat': { limit: 50, windowMs: 3600_000 }, // 50 per hour
  'api:create_event': { limit: 10, windowMs: 3600_000 }, // 10 per hour
  'api:create_expense': { limit: 100, windowMs: 3600_000 }, // 100 per hour
  'api:create_task': { limit: 100, windowMs: 3600_000 },
  'api:create_vendor': { limit: 50, windowMs: 3600_000 },
  'api:create_idea': { limit: 50, windowMs: 3600_000 },
};

export class RateLimiter {
  private repo: SecurityRepository;

  constructor(db: Database) {
    this.repo = new SecurityRepository(db);
  }

  /**
   * Check if request is allowed under rate limit
   */
  async check(
    userId: string,
    bucket: RateLimitBucket
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const config = LIMITS[bucket];
    
    if (!config) {
      throw new Error(`Unknown rate limit bucket: ${bucket}`);
    }

    const result = await this.repo.checkRateLimit(
      userId,
      bucket,
      config.limit,
      config.windowMs
    );

    return {
      allowed: result.allowed,
      current: result.current,
      limit: config.limit,
    };
  }

  /**
   * Cleanup expired rate limit entries
   * Should be called periodically (e.g., via cron)
   */
  async cleanup(): Promise<number> {
    return this.repo.cleanupExpiredRateLimits();
  }
}
