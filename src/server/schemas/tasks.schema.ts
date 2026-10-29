import 'server-only';
/**
 * Tasks API schemas
 * Spec: spec.md §8.3
 */

import { z } from 'zod';

const categoryKeys = [
  'venue',
  'catering',
  'decor',
  'entertainment',
  'photography',
  'attire',
  'invitations',
  'gifts',
  'transport',
  'accommodation',
  'other',
] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  categoryKey: z.enum(categoryKeys).nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['high', 'medium', 'low']),
  notes: z.string().max(1000).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  categoryKey: z.enum(categoryKeys).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
