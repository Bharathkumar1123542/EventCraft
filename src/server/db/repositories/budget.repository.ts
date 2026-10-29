import 'server-only';
/**
 * Budget repository
 * Spec: spec.md §5.3
 * Owner-scoped: validates event ownership before operations
 */

import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client';
import { budgetCategories, expenses, events } from '../schema';
import type { CategoryKey } from '@/domain/types';

export interface SetCategoriesInput {
  eventId: string;
  ownerId: string;
  categories: Array<{
    categoryKey: CategoryKey;
    allocatedMinor: number;
  }>;
}

export interface CreateExpenseInput {
  eventId: string;
  ownerId: string;
  categoryKey: CategoryKey;
  label: string;
  amountMinor: number;
  status: 'committed' | 'paid';
  notes?: string;
}

export interface UpdateExpenseInput {
  label?: string | undefined;
  amountMinor?: number | undefined;
  status?: 'committed' | 'paid' | undefined;
  notes?: string | undefined;
}

export class BudgetRepository {
  constructor(private db: Database) {}

  /**
   * Set budget categories for event
   * Owner-scoped: validates event ownership
   * Replaces all existing categories atomically
   * Trigger enforces sum = total_budget_minor
   */
  async setCategories(input: SetCategoriesInput) {
    // Verify ownership
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    // Atomic replace
    await this.db.transaction(async (tx) => {
      // Delete existing
      await tx
        .delete(budgetCategories)
        .where(eq(budgetCategories.eventId, input.eventId));

      // Insert new
      if (input.categories.length > 0) {
        await tx.insert(budgetCategories).values(
          input.categories.map((c) => ({
            eventId: input.eventId,
            categoryKey: c.categoryKey,
            allocatedMinor: c.allocatedMinor,
          }))
        );
      }
    });

    return this.getCategories(input.eventId, input.ownerId);
  }

  /**
   * Get budget categories for event
   * Owner-scoped: validates event ownership
   */
  async getCategories(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.eventId, eventId));
  }

  /**
   * Create expense
   * Owner-scoped: validates event ownership
   */
  async createExpense(input: CreateExpenseInput) {
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    const [expense] = await this.db
      .insert(expenses)
      .values({
        eventId: input.eventId,
        categoryKey: input.categoryKey,
        label: input.label,
        amountMinor: input.amountMinor,
        status: input.status,
        notes: input.notes,
      })
      .returning();

    return expense!;
  }

  /**
   * Get expense by ID
   * Owner-scoped: validates event ownership
   */
  async getExpenseById(expenseId: string, ownerId: string) {
    const [expense] = await this.db
      .select({
        expense: expenses,
        event: events,
      })
      .from(expenses)
      .innerJoin(events, eq(expenses.eventId, events.id))
      .where(and(eq(expenses.id, expenseId), eq(events.ownerId, ownerId)))
      .limit(1);

    return expense?.expense ?? null;
  }

  /**
   * List expenses for event
   * Owner-scoped: validates event ownership
   */
  async listExpenses(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(expenses)
      .where(eq(expenses.eventId, eventId))
      .orderBy(desc(expenses.createdAt));
  }

  /**
   * Update expense
   * Owner-scoped: validates event ownership
   */
  async updateExpense(
    expenseId: string,
    ownerId: string,
    input: UpdateExpenseInput
  ) {
    const [updated] = await this.db
      .update(expenses)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(
            expenses.eventId,
            this.db
              .select({ id: events.id })
              .from(events)
              .where(eq(events.ownerId, ownerId))
          )
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Delete expense
   * Owner-scoped: validates event ownership
   */
  async deleteExpense(expenseId: string, ownerId: string): Promise<boolean> {
    // First get the expense to verify ownership via event
    const expense = await this.getExpenseById(expenseId, ownerId);
    if (!expense) return false;

    const result = await this.db
      .delete(expenses)
      .where(eq(expenses.id, expenseId))
      .returning({ id: expenses.id });

    return result.length > 0;
  }

  /**
   * Get budget rollup (allocated, committed, paid per category)
   * Owner-scoped: validates event ownership
   */
  async getBudgetRollup(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    const cats = await this.db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.eventId, eventId));

    const exps = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.eventId, eventId));

    // Group expenses by category
    const expensesByCategory = exps.reduce(
      (acc, exp) => {
        if (!acc[exp.categoryKey]) {
          acc[exp.categoryKey] = { committed: 0, paid: 0 };
        }
        if (exp.status === 'committed') {
          acc[exp.categoryKey]!.committed += exp.amountMinor;
        } else {
          acc[exp.categoryKey]!.paid += exp.amountMinor;
        }
        return acc;
      },
      {} as Record<string, { committed: number; paid: number }>
    );

    return cats.map((cat) => {
      const exp = expensesByCategory[cat.categoryKey] ?? {
        committed: 0,
        paid: 0,
      };
      return {
        categoryKey: cat.categoryKey,
        allocatedMinor: cat.allocatedMinor,
        committedMinor: exp.committed,
        paidMinor: exp.paid,
        remainingMinor: cat.allocatedMinor - exp.committed - exp.paid,
      };
    });
  }

  /**
   * Verify event ownership
   */
  private async verifyOwnership(
    eventId: string,
    ownerId: string
  ): Promise<boolean> {
    const [event] = await this.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.ownerId, ownerId)))
      .limit(1);

    return event !== undefined;
  }
}
