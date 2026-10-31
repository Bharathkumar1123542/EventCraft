/**
 * Date utilities
 * All calendar dates are IsoDate strings (YYYY-MM-DD)
 * Spec: spec.md §4.2
 */

import type { Clock, IsoDate, Result } from './types';

/**
 * Parse and validate an ISO date string
 * Rejects invalid dates like 2026-02-30
 */
export function parseIsoDate(s: string): Result<IsoDate, 'INVALID_DATE'> {
  // Pattern: YYYY-MM-DD
  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = pattern.exec(s);

  if (!match) {
    return { ok: false, error: 'INVALID_DATE' };
  }

  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);

  // Validate ranges
  if (month < 1 || month > 12) {
    return { ok: false, error: 'INVALID_DATE' };
  }

  if (day < 1 || day > 31) {
    return { ok: false, error: 'INVALID_DATE' };
  }

  // Check actual date validity (handles leap years, month lengths)
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, error: 'INVALID_DATE' };
  }

  return { ok: true, value: s as IsoDate };
}

/**
 * Add days to a date
 * n can be negative for subtraction
 */
export function addDays(d: IsoDate, n: number): IsoDate {
  const [year, month, day] = d.split('-').map((x) => parseInt(x, 10));
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + n);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${dayStr}` as IsoDate;
}

/**
 * Calculate whole days between two dates (to - from)
 * Uses day number calculation to avoid DST issues
 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [y1, m1, d1] = from.split('-').map((x) => parseInt(x, 10));
  const [y2, m2, d2] = to.split('-').map((x) => parseInt(x, 10));

  const dayNum1 = Math.floor(Date.UTC(y1!, m1! - 1, d1!) / 86_400_000);
  const dayNum2 = Math.floor(Date.UTC(y2!, m2! - 1, d2!) / 86_400_000);

  return dayNum2 - dayNum1;
}

/**
 * Get today's date in a specific timezone
 * Uses Intl.DateTimeFormat to handle DST correctly
 */
export function todayIn(clock: Clock, timeZone: string): IsoDate {
  const now = clock.now();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  return `${year}-${month}-${day}` as IsoDate;
}

/**
 * Check if a timezone identifier is valid
 */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
