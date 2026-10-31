import 'server-only';
/**
 * Ideas API schemas
 * Spec: spec.md §8.5
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

export const createIdeaSchema = z.object({
  kind: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  costTier: z.string().min(1).max(20),
  categoryKey: z.enum(categoryKeys).nullable(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
