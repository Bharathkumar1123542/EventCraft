import 'server-only';
/**
 * Vendors API schemas
 * Spec: spec.md §8.4
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

export const createVendorSchema = z.object({
  categoryKey: z.enum(categoryKeys),
  need: z.string().min(1).max(200),
  questions: z.array(z.string().min(1).max(500)).min(0).max(20),
  isMustHave: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export const updateVendorSchema = z.object({
  need: z.string().min(1).max(200).optional(),
  questions: z.array(z.string().min(1).max(500)).min(0).max(20).optional(),
  status: z
    .enum(['not_started', 'contacted', 'quoted', 'booked', 'declined'])
    .optional(),
  isMustHave: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
