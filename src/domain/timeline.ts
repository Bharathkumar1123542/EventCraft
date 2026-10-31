/**
 * Timeline scheduling with compression
 * Spec: spec.md §4.5, DD-14
 */

import type { IsoDate, CategoryKey, Priority } from './types';
import { addDays, daysBetween } from './dates';

export interface TaskDraft {
  title: string;
  description: string;
  categoryKey: CategoryKey | null;
  idealDaysBefore: number;
  priority: Priority;
}

export interface ScheduledTask extends TaskDraft {
  dueDate: IsoDate;
  isCompressed: boolean;
  __originalIndex?: number; // Internal: for stable sorting
}

export interface ScheduleContext {
  today: IsoDate;
  eventDate: IsoDate;
  horizonDays: number;
}

/**
 * Schedule tasks with compression for late tasks
 * Spec: spec.md §4.5, DD-14
 * 
 * Algorithm:
 * 1. Clamp idealDaysBefore to [0, horizonDays]
 * 2. Calculate ideal = eventDate - idealDaysBefore
 * 3. Tasks with ideal < today are "late", others "on time"
 * 4. On-time tasks: dueDate = ideal, isCompressed = false
 * 5. Late tasks compressed into [today, windowEnd] where windowEnd is
 *    min(eventDate, earliest on-time dueDate)
 * 6. Sort late tasks by idealDaysBefore descending, then input index ascending
 * 7. Distribute late tasks evenly: dueDate = today + floor(k * span / n)
 * 
 * Postcondition: today ≤ dueDate ≤ eventDate for all tasks
 */
export function scheduleTasks(drafts: readonly TaskDraft[], ctx: ScheduleContext): ScheduledTask[] {
  const { today, eventDate, horizonDays } = ctx;

  if (drafts.length === 0) {
    return [];
  }

  // Step 1 & 2: Clamp and calculate ideal dates
  const withIdeal = drafts.map((draft, index) => {
    const clamped = Math.max(0, Math.min(draft.idealDaysBefore, horizonDays));
    const ideal = addDays(eventDate, -clamped);
    return { draft, index, clamped, ideal };
  });

  // Step 3: Separate late and on-time tasks
  const late = withIdeal.filter((t) => daysBetween(t.ideal, today) > 0);
  const onTime = withIdeal.filter((t) => daysBetween(t.ideal, today) <= 0);

  // Step 4: Schedule on-time tasks
  const onTimeScheduled: ScheduledTask[] = onTime.map((t) => ({
    ...t.draft,
    dueDate: t.ideal,
    isCompressed: false,
    __originalIndex: t.index,
  }));

  // If no late tasks, return on-time only
  if (late.length === 0) {
    return onTimeScheduled.sort((a, b) => {
      const dateDiff = daysBetween(a.dueDate, b.dueDate);
      if (dateDiff !== 0) return dateDiff;
      return (a.__originalIndex ?? 0) - (b.__originalIndex ?? 0);
    });
  }

  // Step 5: Calculate window for late tasks
  const earliestOnTime = onTime.length > 0
    ? onTime.reduce((earliest, t) => (daysBetween(t.ideal, earliest) < 0 ? t.ideal : earliest), onTime[0]!.ideal)
    : eventDate;
  const windowEnd = daysBetween(earliestOnTime, eventDate) <= 0 ? earliestOnTime : eventDate;
  const span = daysBetween(today, windowEnd);

  // Step 6: Sort late tasks
  const sortedLate = [...late].sort((a, b) => {
    // By idealDaysBefore descending (tasks with longer lead time first)
    if (a.clamped !== b.clamped) {
      return b.clamped - a.clamped;
    }
    // Then by input index ascending (stable)
    return a.index - b.index;
  });

  // Step 7: Distribute late tasks evenly
  const lateScheduled: ScheduledTask[] = sortedLate.map((t, k) => {
    const offset = Math.floor((k * span) / late.length);
    const dueDate = addDays(today, offset);
    return {
      ...t.draft,
      dueDate,
      isCompressed: true,
      __originalIndex: t.index,
    };
  });

  // Combine and sort by due date, then original index
  const all = [...onTimeScheduled, ...lateScheduled];
  return all.sort((a, b) => {
    const dateDiff = daysBetween(a.dueDate, b.dueDate);
    if (dateDiff !== 0) return dateDiff;
    return (a.__originalIndex ?? 0) - (b.__originalIndex ?? 0);
  });
}
