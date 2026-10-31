import 'server-only';
/**
 * Budget and expense tables
 * Spec: spec.md §5.1
 */

import { pgTable, uuid, text, bigint, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { events } from './events';

export const budgetCategories = pgTable('budget_categories', {
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  categoryKey: text('category_key').notNull(),
  allocatedMinor: bigint('allocated_minor', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.categoryKey] }),
}));

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  categoryKey: text('category_key').notNull(),
  label: text('label').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  status: text('status', { enum: ['committed', 'paid'] }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing expenses by event and category
// CREATE INDEX expenses_event_category_idx ON expenses(event_id, category_key, created_at DESC);
