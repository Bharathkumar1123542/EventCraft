import 'server-only';
/**
 * Rate limiting and usage tracking tables
 * Spec: spec.md §7.3
 */

import { pgTable, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const rateLimits = pgTable('rate_limits', {
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  bucket: text('bucket').notNull(), // e.g., 'generation:initial_plan', 'api:create_event'
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.bucket, table.windowStart] }),
}));

export const usageCounters = pgTable('usage_counters', {
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  metric: text('metric').notNull(), // e.g., 'total_tokens', 'total_events', 'total_generations'
  value: integer('value').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.metric] }),
}));

// Index for cleaning up expired rate limits
// CREATE INDEX rate_limits_expires_idx ON rate_limits(expires_at);
