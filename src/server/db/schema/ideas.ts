import 'server-only';
/**
 * Ideas table
 * Spec: spec.md §5.1
 */

import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events';

export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  costTier: text('cost_tier').notNull(),
  categoryKey: text('category_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing ideas by event
// CREATE INDEX ideas_event_idx ON ideas(event_id, created_at DESC);
