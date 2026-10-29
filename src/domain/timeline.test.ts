import { describe, it, expect } from 'vitest';
import { fc } from '@vitest/utils';
import { scheduleTasks } from './timeline';
import type { TaskDraft, ScheduleContext } from './timeline';
import type { IsoDate } from './types';
import { addDays, daysBetween } from './dates';

describe('timeline', () => {
  const today = '2026-10-27' as IsoDate;
  const eventDate = addDays(today, 90); // ~3 months out

  describe('scheduleTasks', () => {
    it('handles empty drafts', () => {
      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks([], ctx);
      expect(result).toEqual([]);
    });

    it('schedules on-time tasks at ideal dates', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Book venue',
          description: '',
          categoryKey: 'venue',
          idealDaysBefore: 60,
          priority: 'high',
        },
        {
          title: 'Order cake',
          description: '',
          categoryKey: null,
          idealDaysBefore: 7,
          priority: 'medium',
        },
      ];

      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks(drafts, ctx);

      expect(result).toHaveLength(2);
      expect(result.every((t) => !t.isCompressed)).toBe(true);

      const venue = result.find((t) => t.title === 'Book venue')!;
      expect(venue.dueDate).toBe(addDays(eventDate, -60));

      const cake = result.find((t) => t.title === 'Order cake')!;
      expect(cake.dueDate).toBe(addDays(eventDate, -7));
    });

    it('compresses late tasks into available window', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Task 1',
          description: '',
          categoryKey: null,
          idealDaysBefore: 200, // Way past horizon
          priority: 'high',
        },
        {
          title: 'Task 2',
          description: '',
          categoryKey: null,
          idealDaysBefore: 150,
          priority: 'medium',
        },
      ];

      // Event is soon (only 10 days out)
      const soonCtx: ScheduleContext = {
        today,
        eventDate: addDays(today, 10),
        horizonDays: 120,
      };

      const result = scheduleTasks(drafts, soonCtx);

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.isCompressed)).toBe(true);

      // All tasks should be between today and eventDate
      result.forEach((task) => {
        expect(daysBetween(today, task.dueDate)).toBeGreaterThanOrEqual(0);
        expect(daysBetween(task.dueDate, soonCtx.eventDate)).toBeGreaterThanOrEqual(0);
      });
    });

    it('marks only late tasks as compressed', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Late task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 200, // Already passed
          priority: 'high',
        },
        {
          title: 'On-time task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 30, // Still achievable
          priority: 'medium',
        },
      ];

      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks(drafts, ctx);

      const late = result.find((t) => t.title === 'Late task')!;
      expect(late.isCompressed).toBe(true);

      const onTime = result.find((t) => t.title === 'On-time task')!;
      expect(onTime.isCompressed).toBe(false);
    });

    it('sorts results by due date then input index', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'C',
          description: '',
          categoryKey: null,
          idealDaysBefore: 60,
          priority: 'low',
        },
        {
          title: 'A',
          description: '',
          categoryKey: null,
          idealDaysBefore: 90,
          priority: 'high',
        },
        {
          title: 'B',
          description: '',
          categoryKey: null,
          idealDaysBefore: 90, // Same as A, should maintain input order
          priority: 'medium',
        },
      ];

      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks(drafts, ctx);

      // A and B have same due date, should be in input order (A before B)
      const aIndex = result.findIndex((t) => t.title === 'A');
      const bIndex = result.findIndex((t) => t.title === 'B');
      expect(aIndex).toBeLessThan(bIndex);
    });

    it('handles event today', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Last minute task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 7,
          priority: 'high',
        },
      ];

      const ctx: ScheduleContext = {
        today,
        eventDate: today, // Event is today!
        horizonDays: 30,
      };

      const result = scheduleTasks(drafts, ctx);

      expect(result).toHaveLength(1);
      expect(result[0]!.dueDate).toBe(today);
      expect(result[0]!.isCompressed).toBe(true);
    });

    it('handles event 3 days out with many late tasks', () => {
      const drafts: TaskDraft[] = Array.from({ length: 10 }, (_, i) => ({
        title: `Task ${i}`,
        description: '',
        categoryKey: null,
        idealDaysBefore: (i + 1) * 30, // 30, 60, 90, ... 300 days before
        priority: 'medium' as const,
      }));

      const ctx: ScheduleContext = {
        today,
        eventDate: addDays(today, 3),
        horizonDays: 365,
      };

      const result = scheduleTasks(drafts, ctx);

      expect(result).toHaveLength(10);

      // All should be compressed
      expect(result.every((t) => t.isCompressed)).toBe(true);

      // All should be in the 3-day window
      result.forEach((task) => {
        const daysFromToday = daysBetween(today, task.dueDate);
        expect(daysFromToday).toBeGreaterThanOrEqual(0);
        expect(daysFromToday).toBeLessThanOrEqual(3);
      });

      // Should be distributed across the window
      const uniqueDates = new Set(result.map((t) => t.dueDate));
      expect(uniqueDates.size).toBeGreaterThan(1); // Not all on same day
    });

    it('handles all tasks late', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Task 1',
          description: '',
          categoryKey: null,
          idealDaysBefore: 100,
          priority: 'high',
        },
        {
          title: 'Task 2',
          description: '',
          categoryKey: null,
          idealDaysBefore: 95,
          priority: 'high',
        },
      ];

      const ctx: ScheduleContext = {
        today,
        eventDate: addDays(today, 7),
        horizonDays: 120,
      };

      const result = scheduleTasks(drafts, ctx);

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.isCompressed)).toBe(true);

      // Task 1 (longer lead time) should be scheduled first
      expect(result[0]!.title).toBe('Task 1');
      expect(daysBetween(result[0]!.dueDate, result[1]!.dueDate)).toBeGreaterThanOrEqual(0);
    });

    it('clamps idealDaysBefore to horizonDays', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Far out task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 1000, // Way beyond horizon
          priority: 'medium',
        },
      ];

      const ctx: ScheduleContext = {
        today,
        eventDate: addDays(today, 200),
        horizonDays: 120,
      };

      const result = scheduleTasks(drafts, ctx);

      // Should be clamped to 120 days before event
      const expected = addDays(ctx.eventDate, -120);
      expect(result[0]!.dueDate).toBe(expected);
      expect(result[0]!.isCompressed).toBe(false);
    });

    it('handles negative idealDaysBefore as zero', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Event day task',
          description: '',
          categoryKey: null,
          idealDaysBefore: -5, // Negative should be clamped to 0
          priority: 'high',
        },
      ];

      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks(drafts, ctx);

      expect(result[0]!.dueDate).toBe(eventDate);
    });

    it('windowEnd uses earliest on-time task when before eventDate', () => {
      const drafts: TaskDraft[] = [
        {
          title: 'Late task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 200,
          priority: 'high',
        },
        {
          title: 'Early on-time task',
          description: '',
          categoryKey: null,
          idealDaysBefore: 30, // This creates the window end
          priority: 'medium',
        },
      ];

      const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
      const result = scheduleTasks(drafts, ctx);

      const late = result.find((t) => t.title === 'Late task')!;
      const early = result.find((t) => t.title === 'Early on-time task')!;

      // Late task should not be scheduled past the early on-time task
      expect(daysBetween(late.dueDate, early.dueDate)).toBeLessThanOrEqual(0);
    });

    // Property tests
    it('property: all due dates are between today and eventDate', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 20 }),
              description: fc.string({ maxLength: 50 }),
              categoryKey: fc.constantFrom('venue', 'catering', null),
              idealDaysBefore: fc.integer({ min: 0, max: 365 }),
              priority: fc.constantFrom('low', 'medium', 'high'),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.integer({ min: 1, max: 365 }),
          (drafts, daysUntilEvent) => {
            const ctx: ScheduleContext = {
              today,
              eventDate: addDays(today, daysUntilEvent),
              horizonDays: 365,
            };

            const result = scheduleTasks(drafts, ctx);

            return result.every((task) => {
              const fromToday = daysBetween(ctx.today, task.dueDate);
              const toEvent = daysBetween(task.dueDate, ctx.eventDate);
              return fromToday >= 0 && toEvent >= 0;
            });
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('property: result length equals draft length', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1 }),
              description: fc.string(),
              categoryKey: fc.constantFrom('venue', null),
              idealDaysBefore: fc.integer({ min: 0, max: 100 }),
              priority: fc.constantFrom('low', 'medium', 'high'),
            }),
            { maxLength: 20 }
          ),
          (drafts) => {
            const ctx: ScheduleContext = { today, eventDate, horizonDays: 120 };
            const result = scheduleTasks(drafts, ctx);
            return result.length === drafts.length;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('property: isCompressed is true only for late tasks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1 }),
              description: fc.string(),
              categoryKey: fc.constantFrom('venue', null),
              idealDaysBefore: fc.integer({ min: 0, max: 200 }),
              priority: fc.constantFrom('low', 'medium', 'high'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 30, max: 120 }),
          (drafts, daysUntilEvent) => {
            const ctx: ScheduleContext = {
              today,
              eventDate: addDays(today, daysUntilEvent),
              horizonDays: 120,
            };

            const result = scheduleTasks(drafts, ctx);

            return result.every((task) => {
              const draft = drafts.find((d) => d.title === task.title)!;
              const clamped = Math.min(draft.idealDaysBefore, ctx.horizonDays);
              const ideal = addDays(ctx.eventDate, -clamped);
              const isLate = daysBetween(ideal, ctx.today) > 0;

              return task.isCompressed === isLate;
            });
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
