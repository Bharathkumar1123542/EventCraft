import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';
import {
  initialAllocation,
  applyAiWeights,
  editCategory,
  setLock,
  setTotal,
  summarize,
} from './budget';
import type { BudgetCategoryState, ExpenseLite } from './budget';
import type { EventType, CategoryKey } from './types';
import { MAX_MINOR } from './money';

describe('budget', () => {
  describe('initialAllocation', () => {
    it('creates allocation from template defaults', () => {
      const result = initialAllocation('wedding', 100000);
      expect(result).toHaveLength(10);
      expect(result.every((c) => !c.isLocked)).toBe(true);
      expect(result.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(100000);
    });

    it('handles total of 1 minor unit', () => {
      const result = initialAllocation('wedding', 1);
      expect(result.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(1);
      expect(result.some((c) => c.allocatedMinor === 1)).toBe(true);
    });

    it('handles MAX_MINOR', () => {
      const result = initialAllocation('birthday', MAX_MINOR);
      expect(result.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(MAX_MINOR);
    });

    it('distributes zero total as all zeros', () => {
      const result = initialAllocation('community', 0);
      expect(result.every((c) => c.allocatedMinor === 0)).toBe(true);
    });
  });

  describe('applyAiWeights', () => {
    it('applies AI suggestions to unlocked categories', () => {
      const current = initialAllocation('wedding', 100000);
      // AI suggests higher weight for venue
      const result = applyAiWeights('wedding', 100000, current, { venue: 5000 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const venue = result.value.find((c) => c.key === 'venue')!;
        expect(venue.allocatedMinor).toBeGreaterThan(24000); // More than default 24%
      }
    });

    it('respects locked categories', () => {
      const current = initialAllocation('wedding', 100000);
      current[0] = { ...current[0]!, isLocked: true };

      const result = applyAiWeights('wedding', 100000, current, { venue: 5000 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]!.allocatedMinor).toBe(current[0]!.allocatedMinor);
      }
    });

    it('clamps AI weights to min/max BPS', () => {
      const current = initialAllocation('wedding', 100000);
      // Try to set extremely high weight
      const result = applyAiWeights('wedding', 100000, current, { venue: 10000 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const venue = result.value.find((c) => c.key === 'venue')!;
        // Should be clamped to maxBps (6000)
        expect(venue.allocatedMinor).toBeLessThanOrEqual(60000);
      }
    });

    it('uses template defaults for missing AI suggestions', () => {
      const current = initialAllocation('wedding', 100000);
      // Only suggest one category
      const result = applyAiWeights('wedding', 100000, current, { venue: 3000 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(100000);
      }
    });

    it('fails when locked sum exceeds total', () => {
      const current = initialAllocation('wedding', 100000);
      // Lock venue at its current amount
      current[0] = { ...current[0]!, isLocked: true };

      // Try to lower total below locked sum
      const result = applyAiWeights('wedding', 10000, current, {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('BUDGET_BELOW_LOCKED');
      }
    });
  });

  describe('editCategory', () => {
    it('locks edited category at requested amount', () => {
      const current = initialAllocation('wedding', 100000);
      const result = editCategory(current, 'venue', 50000, 100000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const venue = result.value.find((c) => c.key === 'venue')!;
        expect(venue.allocatedMinor).toBe(50000);
        expect(venue.isLocked).toBe(true);
        expect(result.value.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(100000);
      }
    });

    it('rebalances other unlocked categories proportionally', () => {
      const current = initialAllocation('wedding', 100000);
      const result = editCategory(current, 'venue', 60000, 100000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const unlocked = result.value.filter((c) => !c.isLocked);
        expect(unlocked.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(40000);
      }
    });

    it('fails when requested amount exceeds total', () => {
      const current = initialAllocation('wedding', 100000);
      const result = editCategory(current, 'venue', 150000, 100000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('BUDGET_BELOW_LOCKED');
      }
    });

    it('succeeds when setting to exactly total with no other unlocked', () => {
      const current = initialAllocation('wedding', 100000);
      // Lock all but one
      const locked = current.map((c, i) => (i < 9 ? { ...c, isLocked: true } : c));
      const lockedSum = locked
        .slice(0, 9)
        .reduce((sum, c) => sum + c.allocatedMinor, 0);

      const result = editCategory(locked, 'contingency', 100000 - lockedSum, 100000);

      expect(result.ok).toBe(true);
    });
  });

  describe('setLock', () => {
    it('locks a category without changing amounts', () => {
      const current = initialAllocation('wedding', 100000);
      const before = current[0]!.allocatedMinor;

      const result = setLock(current, 'venue', true);

      expect(result[0]!.isLocked).toBe(true);
      expect(result[0]!.allocatedMinor).toBe(before);
    });

    it('unlocks a category', () => {
      const current = initialAllocation('wedding', 100000);
      current[0] = { ...current[0]!, isLocked: true };

      const result = setLock(current, 'venue', false);

      expect(result[0]!.isLocked).toBe(false);
    });

    it('does not affect other categories', () => {
      const current = initialAllocation('wedding', 100000);
      const result = setLock(current, 'venue', true);

      expect(result.slice(1).every((c) => !c.isLocked)).toBe(true);
    });
  });

  describe('setTotal', () => {
    it('increases total proportionally', () => {
      const current = initialAllocation('wedding', 100000);
      const result = setTotal(current, 150000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(150000);
        result.value.forEach((cat, i) => {
          expect(cat.allocatedMinor).toBeGreaterThan(current[i]!.allocatedMinor);
        });
      }
    });

    it('decreases total proportionally', () => {
      const current = initialAllocation('wedding', 100000);
      const result = setTotal(current, 50000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.reduce((sum, c) => sum + c.allocatedMinor, 0)).toBe(50000);
      }
    });

    it('respects locked categories', () => {
      const current = initialAllocation('wedding', 100000);
      current[0] = { ...current[0]!, isLocked: true };
      const lockedAmount = current[0]!.allocatedMinor;

      const result = setTotal(current, 150000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]!.allocatedMinor).toBe(lockedAmount);
      }
    });

    it('fails when new total below locked sum', () => {
      const current = initialAllocation('wedding', 100000);
      current[0] = { ...current[0]!, allocatedMinor: 60000, isLocked: true };

      const result = setTotal(current, 50000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('BUDGET_BELOW_LOCKED');
      }
    });

    it('fails when all locked and total does not match', () => {
      const current = initialAllocation('wedding', 100000).map((c) => ({
        ...c,
        isLocked: true,
      }));

      const result = setTotal(current, 150000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('BUDGET_NO_FLEXIBLE_CATEGORY');
      }
    });

    it('succeeds when all locked and total matches', () => {
      const current = initialAllocation('wedding', 100000).map((c) => ({
        ...c,
        isLocked: true,
      }));

      const result = setTotal(current, 100000);

      expect(result.ok).toBe(true);
    });
  });

  describe('summarize', () => {
    const categories: BudgetCategoryState[] = [
      { key: 'venue', allocatedMinor: 50000, isLocked: false },
      { key: 'catering', allocatedMinor: 30000, isLocked: false },
      { key: 'contingency', allocatedMinor: 20000, isLocked: false },
    ];

    it('calculates committed and paid totals', () => {
      const expenses: ExpenseLite[] = [
        { categoryKey: 'venue', amountMinor: 10000, isPaid: true },
        { categoryKey: 'venue', amountMinor: 5000, isPaid: false },
        { categoryKey: 'catering', amountMinor: 20000, isPaid: true },
      ];

      const result = summarize(categories, expenses);

      const venue = result.find((c) => c.key === 'venue')!;
      expect(venue.committedMinor).toBe(15000);
      expect(venue.paidMinor).toBe(10000);
      expect(venue.remainingMinor).toBe(35000);
    });

    it('marks status as over when committed exceeds allocated', () => {
      const expenses: ExpenseLite[] = [
        { categoryKey: 'venue', amountMinor: 60000, isPaid: false },
      ];

      const result = summarize(categories, expenses);
      const venue = result.find((c) => c.key === 'venue')!;

      expect(venue.status).toBe('over');
      expect(venue.remainingMinor).toBe(-10000);
    });

    it('marks status as near_limit at 90% threshold', () => {
      const expenses: ExpenseLite[] = [
        { categoryKey: 'venue', amountMinor: 45000, isPaid: false }, // 90%
      ];

      const result = summarize(categories, expenses);
      const venue = result.find((c) => c.key === 'venue')!;

      expect(venue.status).toBe('near_limit');
    });

    it('marks status as ok below 90%', () => {
      const expenses: ExpenseLite[] = [
        { categoryKey: 'venue', amountMinor: 44999, isPaid: false }, // Just under 90%
      ];

      const result = summarize(categories, expenses);
      const venue = result.find((c) => c.key === 'venue')!;

      expect(venue.status).toBe('ok');
    });

    it('handles zero allocated with expenses as over', () => {
      const zeroCategories: BudgetCategoryState[] = [
        { key: 'venue', allocatedMinor: 0, isLocked: false },
      ];
      const expenses: ExpenseLite[] = [{ categoryKey: 'venue', amountMinor: 1, isPaid: false }];

      const result = summarize(zeroCategories, expenses);

      expect(result[0]!.status).toBe('over');
    });

    it('handles zero allocated with no expenses as ok', () => {
      const zeroCategories: BudgetCategoryState[] = [
        { key: 'venue', allocatedMinor: 0, isLocked: false },
      ];

      const result = summarize(zeroCategories, []);

      expect(result[0]!.status).toBe('ok');
    });

    it('handles no expenses', () => {
      const result = summarize(categories, []);

      result.forEach((cat) => {
        expect(cat.committedMinor).toBe(0);
        expect(cat.paidMinor).toBe(0);
        expect(cat.remainingMinor).toBe(cat.allocatedMinor);
        expect(cat.status).toBe('ok');
      });
    });
  });

  // Property tests (10,000 runs as per spec SC-02)
  describe('property tests', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`initialAllocation for ${type} always sums to total`, () => {
        fc.assert(
          fc.property(fc.integer({ min: 0, max: MAX_MINOR }), (total) => {
            const result = initialAllocation(type, total);
            const sum = result.reduce((acc, c) => acc + c.allocatedMinor, 0);
            return sum === total;
          }),
          { numRuns: 10000 }
        );
      });
    });

    eventTypes.forEach((type) => {
      it(`applyAiWeights for ${type} preserves sum invariant`, () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: MAX_MINOR }),
            fc.array(fc.boolean()),
            fc.record({
              venue: fc.integer({ min: 0, max: 10000 }),
            }),
            (total, locks, aiBps) => {
              const current = initialAllocation(type, total);
              // Apply locks
              locks.forEach((isLocked, i) => {
                if (i < current.length) {
                  current[i] = { ...current[i]!, isLocked };
                }
              });

              const result = applyAiWeights(type, total, current, aiBps);
              if (!result.ok) return true; // Errors are valid outcomes

              const sum = result.value.reduce((acc, c) => acc + c.allocatedMinor, 0);
              return sum === total;
            }
          ),
          { numRuns: 10000 }
        );
      });
    });

    it('editCategory preserves sum invariant', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 100000 }),
          fc.integer({ min: 0, max: 100000 }),
          (total, requested) => {
            const current = initialAllocation('wedding', total);
            const result = editCategory(current, 'venue', requested, total);

            if (!result.ok) return true;

            const sum = result.value.reduce((acc, c) => acc + c.allocatedMinor, 0);
            return sum === total;
          }
        ),
        { numRuns: 10000 }
      );
    });

    it('setTotal preserves sum invariant', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 100000 }),
          fc.integer({ min: 0, max: MAX_MINOR }),
          fc.array(fc.boolean(), { maxLength: 10 }),
          (initialTotal, newTotal, locks) => {
            const current = initialAllocation('wedding', initialTotal);
            // Apply locks
            locks.forEach((isLocked, i) => {
              if (i < current.length) {
                current[i] = { ...current[i]!, isLocked };
              }
            });

            const result = setTotal(current, newTotal);

            if (!result.ok) return true;

            const sum = result.value.reduce((acc, c) => acc + c.allocatedMinor, 0);
            return sum === newTotal;
          }
        ),
        { numRuns: 10000 }
      );
    });
  });
});
