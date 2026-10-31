/**
 * Domain layer exports
 * Pure business logic with no I/O or framework dependencies
 */

// Types
export type * from './types';

// Money
export { CURRENCIES, MAX_MINOR, isSafeMinor, toMinor, formatMoney, allocateByWeights } from './money';

// Dates
export { parseIsoDate, addDays, daysBetween, todayIn, isValidTimeZone } from './dates';
export { SystemClock, FixedClock } from './clock';

// Templates
export { TEMPLATES, getCategoryKeys, getCategoryTemplate, isValidCategoryKey } from './templates';
export type { CategoryTemplate, EventTemplate } from './templates';

// Budget
export {
  initialAllocation,
  applyAiWeights,
  editCategory,
  setLock,
  setTotal,
  summarize,
} from './budget';
export type { BudgetCategoryState, BudgetError, ExpenseLite, CategorySummary } from './budget';

// Timeline
export { scheduleTasks } from './timeline';
export type { TaskDraft, ScheduledTask, ScheduleContext } from './timeline';
