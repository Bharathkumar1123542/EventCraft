import 'server-only';
/**
 * Budget API schemas
 * Spec: spec.md §8.2
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

export const setCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        categoryKey: z.enum(categoryKeys),
        allocatedMinor: z.number().int().min(0),
      })
    )
    .min(1)
    .max(20),
});

export const createExpenseSchema = z.object({
  categoryKey: z.enum(categoryKeys),
  label: z.string().min(1).max(200),
  amountMinor: z.number().int().min(0),
  status: z.enum(['committed', 'paid']),
  notes: z.string().max(1000).optional(),
});

export const updateExpenseSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  amountMinor: z.number().int().min(0).optional(),
  status: z.enum(['committed', 'paid']).optional(),
  notes: z.string().max(1000).optional(),
});

export type SetCategoriesInput = z.infer<typeof setCategoriesSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
