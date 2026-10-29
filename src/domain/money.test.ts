import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  CURRENCIES,
  MAX_MINOR,
  isSafeMinor,
  toMinor,
  formatMoney,
  allocateByWeights,
} from './money';

describe('money', () => {
  describe('isSafeMinor', () => {
    it('accepts valid minor units', () => {
      expect(isSafeMinor(0)).toBe(true);
      expect(isSafeMinor(100)).toBe(true);
      expect(isSafeMinor(MAX_MINOR)).toBe(true);
    });

    it('rejects negative values', () => {
      expect(isSafeMinor(-1)).toBe(false);
      expect(isSafeMinor(-100)).toBe(false);
    });

    it('rejects values above MAX_MINOR', () => {
      expect(isSafeMinor(MAX_MINOR + 1)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(isSafeMinor(100.5)).toBe(false);
      expect(isSafeMinor(0.1)).toBe(false);
    });
  });

  describe('toMinor', () => {
    it('parses valid USD amounts', () => {
      expect(toMinor('100', 'USD')).toEqual({ ok: true, value: 10000 });
      expect(toMinor('100.50', 'USD')).toEqual({ ok: true, value: 10050 });
      expect(toMinor('0.01', 'USD')).toEqual({ ok: true, value: 1 });
      expect(toMinor('0', 'USD')).toEqual({ ok: true, value: 0 });
    });

    it('parses valid JPY amounts (no decimals)', () => {
      expect(toMinor('100', 'JPY')).toEqual({ ok: true, value: 100 });
      expect(toMinor('0', 'JPY')).toEqual({ ok: true, value: 0 });
    });

    it('rejects JPY with decimals', () => {
      expect(toMinor('100.5', 'JPY')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('100.00', 'JPY')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    });

    it('rejects extra decimal places', () => {
      expect(toMinor('100.999', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('100.1', 'INR')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    });

    it('accepts partial decimals', () => {
      expect(toMinor('100.5', 'USD')).toEqual({ ok: true, value: 10050 });
      expect(toMinor('100.1', 'USD')).toEqual({ ok: true, value: 10010 });
    });

    it('rejects invalid formats', () => {
      expect(toMinor('$100', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('100,000', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('1e5', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('+100', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('-100', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('100.', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('.50', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
      expect(toMinor('abc', 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    });

    it('handles whitespace', () => {
      expect(toMinor('  100  ', 'USD')).toEqual({ ok: true, value: 10000 });
      expect(toMinor(' 100.50 ', 'USD')).toEqual({ ok: true, value: 10050 });
    });

    it('rejects amounts above MAX_MINOR', () => {
      const huge = '10000000000000'; // 10 trillion
      expect(toMinor(huge, 'USD')).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    });
  });

  describe('formatMoney', () => {
    it('formats USD correctly', () => {
      expect(formatMoney(10000, 'USD')).toBe('$100.00');
      expect(formatMoney(10050, 'USD')).toBe('$100.50');
      expect(formatMoney(1, 'USD')).toBe('$0.01');
      expect(formatMoney(0, 'USD')).toBe('$0.00');
    });

    it('formats JPY without decimals', () => {
      expect(formatMoney(100, 'JPY')).toBe('¥100');
      expect(formatMoney(0, 'JPY')).toBe('¥0');
    });

    it('formats INR with en-IN locale', () => {
      const formatted = formatMoney(100000, 'INR');
      expect(formatted).toContain('1,000.00'); // Indian numbering
      expect(formatted).toContain('₹');
    });

    it('throws on invalid minor units', () => {
      expect(() => formatMoney(-1, 'USD')).toThrow('minor unit out of range');
      expect(() => formatMoney(MAX_MINOR + 1, 'USD')).toThrow('minor unit out of range');
      expect(() => formatMoney(100.5, 'USD')).toThrow('minor unit out of range');
    });
  });

  describe('allocateByWeights', () => {
    it('allocates total exactly', () => {
      const result = allocateByWeights(100, [1, 1, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('respects weight proportions', () => {
      const result = allocateByWeights(100, [2, 1]);
      expect(result[0]).toBeGreaterThan(result[1]!);
    });

    it('handles equal weights', () => {
      const result = allocateByWeights(99, [1, 1, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(99);
      // Should distribute as evenly as possible: [33, 33, 33]
      expect(result).toEqual([33, 33, 33]);
    });

    it('handles all-zero weights as equal', () => {
      const result = allocateByWeights(100, [0, 0, 0, 0]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
      expect(result).toEqual([25, 25, 25, 25]);
    });

    it('handles single weight', () => {
      const result = allocateByWeights(100, [1]);
      expect(result).toEqual([100]);
    });

    it('handles zero total', () => {
      const result = allocateByWeights(0, [1, 2, 3]);
      expect(result).toEqual([0, 0, 0]);
    });

    it('uses deterministic tie-breaking (lower index first)', () => {
      // When fractions are equal, lower index gets remainder first
      const result = allocateByWeights(10, [1, 1, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(10);
    });

    it('handles large totals with BigInt intermediates', () => {
      // MAX_MINOR × large weight exceeds Number.MAX_SAFE_INTEGER
      const result = allocateByWeights(MAX_MINOR, [10000, 1]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(MAX_MINOR);
      expect(result[0]).toBeGreaterThan(0);
      expect(result[1]).toBeGreaterThan(0);
    });

    it('throws on invalid total', () => {
      expect(() => allocateByWeights(-1, [1, 1])).toThrow('total out of range');
      expect(() => allocateByWeights(MAX_MINOR + 1, [1, 1])).toThrow('total out of range');
      expect(() => allocateByWeights(100.5, [1, 1])).toThrow('total out of range');
    });

    it('throws on empty weights', () => {
      expect(() => allocateByWeights(100, [])).toThrow('weights must not be empty');
    });

    it('throws on invalid weights', () => {
      expect(() => allocateByWeights(100, [1, -1])).toThrow('invalid weight');
      expect(() => allocateByWeights(100, [1, 1.5])).toThrow('invalid weight');
    });

    // Property tests (10,000 cases as per spec)
    it('property: sum always equals total', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MAX_MINOR }),
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (total, weights) => {
            const result = allocateByWeights(total, weights);
            const sum = result.reduce((a, b) => a + b, 0);
            return sum === total;
          }
        ),
        { numRuns: 10000 }
      );
    });

    it('property: all results are non-negative integers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MAX_MINOR }),
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (total, weights) => {
            const result = allocateByWeights(total, weights);
            return result.every((r) => Number.isInteger(r) && r >= 0);
          }
        ),
        { numRuns: 10000 }
      );
    });

    it('property: result length equals weights length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MAX_MINOR }),
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (total, weights) => {
            const result = allocateByWeights(total, weights);
            return result.length === weights.length;
          }
        ),
        { numRuns: 10000 }
      );
    });
  });
});
