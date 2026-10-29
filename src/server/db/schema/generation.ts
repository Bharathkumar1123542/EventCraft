import 'server-only';
/**
 * AI generation tracking tables
 * Spec: spec.md §5.1, §7.3
 */

import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events';
import { user } from './auth';

export const generationRuns = pgTable('generation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  feature: text('feature', {
    enum: ['initial_plan', 'budget_suggest', 'task_suggest', 'vendor_suggest', 'idea_suggest', 'chat'],
  }).notNull(),
  modelName: text('model_name').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id, { onDelete: 'set null' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Index for listing chat messages by event
// CREATE INDEX chat_messages_event_idx ON chat_messages(event_id, created_at ASC);
// Index for generation runs by event
// CREATE INDEX generation_runs_event_idx ON generation_runs(event_id, created_at DESC);
