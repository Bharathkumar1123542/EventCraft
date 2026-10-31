/**
 * Money utilities
 * All money is stored as integer minor units (cents, paise, etc.)
 * Spec: spec.md §4.1
 */

import type { CurrencyCode, Result } from './types';

// Currency exponents (decimal places)
export const CURRENCIES: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
} as const;

// Maximum safe minor unit value
export const MAX_MINOR = 1_000_000_000_000;

/**
 * Check if a number is a safe minor unit value
 * Must be integer, 0 ≤ n ≤ MAX_MINOR
 */
export function isSafeMinor(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= MAX_MINOR;
}

/**
 * Parse a major unit string to minor units
 * Accepts: ^\d{1,12}(\.\d{1,e})?$ where e is the currency exponent
 * Rejects: extra decimals, signs, separators, exponents
 * Never rounds
 */
export function toMinor(
  major: string,
  currency: CurrencyCode
): Result<number, 'INVALID_AMOUNT'> {
  const exponent = CURRENCIES[currency];
  const trimmed = major.trim();

  // Pattern: up to 12 digits, optional decimal with exact exponent digits
  const pattern =
    exponent === 0
      ? /^\d{1,12}$/
      : new RegExp(`^\\d{1,12}(\\.\\d{1,${exponent}})?$`);

  if (!pattern.test(trimmed)) {
    return { ok: false, error: 'INVALID_AMOUNT' };
  }

  // Split on decimal point
  const [integerPart = '', decimalPart = ''] = trimmed.split('.');

  // Pad decimal part to exponent length
  const paddedDecimal = decimalPart.padEnd(exponent, '0');

  // Combine and parse
  const minorString = integerPart + paddedDecimal;
  const minor = parseInt(minorString, 10);

  if (!isSafeMinor(minor)) {
    return { ok: false, error: 'INVALID_AMOUNT' };
  }

  return { ok: true, value: minor };
}

/**
 * Format minor units as major currency string
 * Uses Intl.NumberFormat with appropriate locale per currency
 */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  if (!isSafeMinor(minor)) {
    throw new RangeError('minor unit out of range');
  }

  const exponent = CURRENCIES[currency];
  const major = minor / Math.pow(10, exponent);

  // INR uses en-IN locale, all others use en-US
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(major);
}

/**
 * Allocate a total amount across weights using largest-remainder method
 * Guarantees: sum(result) === total, all results are non-negative integers
 * Spec: spec.md §4.1, DD-15
 */
export function allocateByWeights(
  total: number,
  weights: readonly number[]
): number[] {
  if (!isSafeMinor(total)) {
    throw new RangeError('total out of range');
  }

  if (weights.length === 0) {
    throw new RangeError('weights must not be empty');
  }

  if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
    throw new RangeError('invalid weight');
  }

  const sum = weights.reduce((a, w) => a + w, 0);

  // If all weights are zero, treat as equal weights
  const effectiveWeights = sum === 0 ? weights.map(() => 1) : weights;
  const denom = BigInt(sum === 0 ? weights.length : sum);
  const T = BigInt(total);

  // Calculate floor shares using BigInt for intermediate calculations
  const out = effectiveWeights.map((w) => Number((T * BigInt(w)) / denom));

  // Calculate remainder
  let remainder = total - out.reduce((a, b) => a + b, 0);

  // Calculate fractional parts for tie-breaking
  const order = effectiveWeights
    .map((w, i) => ({
      i,
      frac: (T * BigInt(w)) % denom,
    }))
    .sort((a, b) => {
      // Sort by fractional part descending, then by index ascending (stable)
      if (a.frac === b.frac) {
        return a.i - b.i;
      }
      return a.frac > b.frac ? -1 : 1;
    });

  // Distribute remainder one unit at a time to highest fractional parts
  for (let k = 0; remainder > 0; k++, remainder--) {
    const index = order[k % order.length]!.i;
    out[index]! += 1;
  }

  return out;
}
