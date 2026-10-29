import 'server-only';
/**
 * Event API schemas
 * Spec: spec.md §8.1
 */

import { z } from 'zod';

export const createEventSchema = z.object({
  type: z.enum(['wedding', 'birthday', 'community']),
  title: z.string().min(1).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(100),
  city: z.string().min(1).max(200).nullable(),
  guestCount: z.number().int().min(1).max(100000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']),
  totalBudgetMinor: z.number().int().min(0),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(200).nullable().optional(),
  guestCount: z.number().int().min(1).max(100000).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
