import 'server-only';
/**
 * Vendors table
 * Spec: spec.md §5.1
 */

import { pgTable, uuid, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events';

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  categoryKey: text('category_key').notNull(),
  need: text('need').notNull(),
  questions: jsonb('questions').notNull().default('[]').$type<string[]>(),
  status: text('status', {
    enum: ['not_started', 'contacted', 'quoted', 'booked', 'declined'],
  }).notNull().default('not_started'),
  isMustHave: boolean('is_must_have').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing vendors by event
// CREATE INDEX vendors_event_idx ON vendors(event_id, created_at DESC);
