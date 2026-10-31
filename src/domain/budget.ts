/**
 * Budget allocation logic
 * Spec: spec.md §4.4
 */

import type { EventType, CategoryKey, Result } from './types';
import { allocateByWeights } from './money';
import { TEMPLATES } from './templates';

export type BudgetError = 'BUDGET_BELOW_LOCKED' | 'BUDGET_NO_FLEXIBLE_CATEGORY';

export interface BudgetCategoryState {
  key: CategoryKey;
  allocatedMinor: number;
  isLocked: boolean;
}

/**
 * Create initial allocation from template defaults
 * Spec: spec.md §4.4
 */
export function initialAllocation(type: EventType, totalMinor: number): BudgetCategoryState[] {
  const template = TEMPLATES[type];
  const weights = template.categories.map((c) => c.defaultBps);
  const allocated = allocateByWeights(totalMinor, weights);

  return template.categories.map((cat, i) => ({
    key: cat.key,
    allocatedMinor: allocated[i]!,
    isLocked: false,
  }));
}

/**
 * Apply AI-suggested weights to unlocked categories
 * Spec: spec.md §4.4
 */
export function applyAiWeights(
  type: EventType,
  totalMinor: number,
  current: BudgetCategoryState[],
  aiBps: Partial<Record<CategoryKey, number>>
): Result<BudgetCategoryState[], BudgetError> {
  const template = TEMPLATES[type];

  // Build effective weights for unlocked categories
  const weights = current.map((state) => {
    if (state.isLocked) return 0; // Locked categories get zero weight

    // Use AI suggestion if present, otherwise template default
    const cat = template.categories.find((c) => c.key === state.key)!;
    const raw = aiBps[state.key] ?? cat.defaultBps;

    // Clamp to [minBps, maxBps]
    return Math.max(cat.minBps, Math.min(raw, cat.maxBps));
  });

  return distributeUnlocked(current, totalMinor, weights);
}

/**
 * Edit a specific category allocation
 * Locks the edited category and rebalances unlocked ones
 * Spec: spec.md §4.4
 */
export function editCategory(
  current: BudgetCategoryState[],
  key: CategoryKey,
  requestedMinor: number,
  totalMinor: number
): Result<BudgetCategoryState[], BudgetError> {
  // Temporarily lock the edited category at the requested amount
  const temp = current.map((state) =>
    state.key === key ? { ...state, allocatedMinor: requestedMinor, isLocked: true } : state
  );

  // Weights for rebalance: current allocated amounts of unlocked categories
  const weights = temp.map((state) =>
    state.isLocked ? 0 : state.allocatedMinor || 1 // Avoid all-zero
  );

  return distributeUnlocked(temp, totalMinor, weights);
}

/**
 * Toggle lock state of a category
 * Does not change any amounts
 */
export function setLock(
  current: BudgetCategoryState[],
  key: CategoryKey,
  isLocked: boolean
): BudgetCategoryState[] {
  return current.map((state) => (state.key === key ? { ...state, isLocked } : state));
}

/**
 * Change the total budget
 * Rebalances unlocked categories proportionally
 * Spec: spec.md §4.4
 */
export function setTotal(
  current: BudgetCategoryState[],
  newTotalMinor: number
): Result<BudgetCategoryState[], BudgetError> {
  // Weights: current allocated amounts
  const weights = current.map((state) =>
    state.isLocked ? 0 : state.allocatedMinor || 1 // Avoid all-zero
  );

  return distributeUnlocked(current, newTotalMinor, weights);
}

/**
 * Core rebalancing logic
 * Distributes remaining budget across unlocked categories by weight
 */
function distributeUnlocked(
  categories: BudgetCategoryState[],
  totalMinor: number,
  weights: number[]
): Result<BudgetCategoryState[], BudgetError> {
  const lockedSum = categories
    .filter((c) => c.isLocked)
    .reduce((sum, c) => sum + c.allocatedMinor, 0);

  // Check if locked sum exceeds total
  if (lockedSum > totalMinor) {
    return { ok: false, error: 'BUDGET_BELOW_LOCKED' };
  }

  const remaining = totalMinor - lockedSum;
  const unlockedIndices = categories
    .map((c, i) => (c.isLocked ? -1 : i))
    .filter((i) => i >= 0);

  // If no unlocked categories
  if (unlockedIndices.length === 0) {
    // If remaining is zero, locked sum equals total - success
    if (remaining === 0) {
      return { ok: true, value: categories };
    }
    // Otherwise, nowhere to put the remaining budget
    return { ok: false, error: 'BUDGET_NO_FLEXIBLE_CATEGORY' };
  }

  // Get weights for unlocked categories
  const unlockedWeights = unlockedIndices.map((i) => weights[i]!);

  // Allocate remaining budget
  const allocated = allocateByWeights(remaining, unlockedWeights);

  // Build result
  const result = [...categories];
  unlockedIndices.forEach((idx, i) => {
    result[idx] = { ...result[idx]!, allocatedMinor: allocated[i]! };
  });

  return { ok: true, value: result };
}

/**
 * Category summary with expense tracking
 */
export interface ExpenseLite {
  categoryKey: CategoryKey;
  amountMinor: number;
  isPaid: boolean;
}

export interface CategorySummary {
  key: CategoryKey;
  allocatedMinor: number;
  committedMinor: number;
  paidMinor: number;
  remainingMinor: number;
  status: 'ok' | 'near_limit' | 'over';
}

/**
 * Summarize budget with expense tracking
 * Spec: spec.md §4.4
 */
export function summarize(
  categories: BudgetCategoryState[],
  expenses: ExpenseLite[]
): CategorySummary[] {
  return categories.map((cat) => {
    const catExpenses = expenses.filter((e) => e.categoryKey === cat.key);
    const committedMinor = catExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
    const paidMinor = catExpenses.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amountMinor, 0);
    const remainingMinor = cat.allocatedMinor - committedMinor;

    let status: 'ok' | 'near_limit' | 'over';
    if (committedMinor > cat.allocatedMinor) {
      status = 'over';
    } else if (cat.allocatedMinor > 0 && committedMinor * 100 >= cat.allocatedMinor * 90) {
      status = 'near_limit';
    } else {
      status = 'ok';
    }

    // Special case: allocated is zero
    if (cat.allocatedMinor === 0) {
      status = committedMinor > 0 ? 'over' : 'ok';
    }

    return {
      key: cat.key,
      allocatedMinor: cat.allocatedMinor,
      committedMinor,
      paidMinor,
      remainingMinor,
      status,
    };
  });
}
