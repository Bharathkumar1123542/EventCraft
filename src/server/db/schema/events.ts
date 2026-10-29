import 'server-only';
/**
 * Events table schema
 * Spec: spec.md §5.1
 */

import { pgTable, uuid, text, date, integer, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['wedding', 'birthday', 'community'] }).notNull(),
  title: text('title').notNull(),
  eventDate: date('event_date').notNull(),
  timezone: text('timezone').notNull(),
  city: text('city'),
  guestCount: integer('guest_count').notNull(),
  currency: text('currency', {
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'],
  }).notNull(),
  totalBudgetMinor: bigint('total_budget_minor', { mode: 'number' }).notNull(),
  preferences: jsonb('preferences').notNull().default('{}'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing user's events
// CREATE INDEX events_owner_created_idx ON events(owner_id, created_at DESC, id DESC);
