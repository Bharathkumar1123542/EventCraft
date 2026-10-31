import 'server-only';
/**
 * Generation API schemas
 * Spec: spec.md §9
 */

import { z } from 'zod';

export const generateInitialPlanSchema = z.object({
  type: z.enum(['wedding', 'birthday', 'community']),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(100),
  city: z.string().min(1).max(200).nullable(),
  guestCount: z.number().int().min(1).max(100000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']),
  totalBudgetMinor: z.number().int().min(0),
  userPrompt: z.string().min(10).max(2000),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export type GenerateInitialPlanInput = z.infer<typeof generateInitialPlanSchema>;
