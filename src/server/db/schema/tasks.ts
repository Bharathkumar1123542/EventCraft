import 'server-only';
/**
 * Tasks table
 * Spec: spec.md §5.1
 */

import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  categoryKey: text('category_key'),
  dueDate: date('due_date').notNull(),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull(),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing tasks by event and due date
// CREATE INDEX tasks_event_due_idx ON tasks(event_id, due_date ASC, priority DESC);
