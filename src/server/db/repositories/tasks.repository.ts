import 'server-only';
/**
 * Tasks repository
 * Spec: spec.md §5.3
 * Owner-scoped: validates event ownership before operations
 */

import { eq, and, asc, desc } from 'drizzle-orm';
import type { Database } from '../client';
import { tasks, events } from '../schema';
import type { CategoryKey, Priority } from '@/domain/types';

export interface CreateTaskInput {
  eventId: string;
  ownerId: string;
  title: string;
  categoryKey: CategoryKey | null;
  dueDate: string; // IsoDate
  priority: Priority;
  notes?: string | undefined;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  categoryKey?: CategoryKey | null | undefined;
  dueDate?: string | undefined;
  priority?: Priority | undefined;
  status?: 'todo' | 'in_progress' | 'done' | undefined;
  notes?: string | undefined;
}

export class TasksRepository {
  constructor(private db: Database) {}

  /**
   * Create task
   * Owner-scoped: validates event ownership
   */
  async create(input: CreateTaskInput) {
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    const [task] = await this.db
      .insert(tasks)
      .values({
        eventId: input.eventId,
        title: input.title,
        categoryKey: input.categoryKey,
        dueDate: input.dueDate,
        priority: input.priority,
        notes: input.notes,
      })
      .returning();

    return task!;
  }

  /**
   * Get task by ID
   * Owner-scoped: validates event ownership
   */
  async getById(taskId: string, ownerId: string) {
    const [task] = await this.db
      .select({
        task: tasks,
        event: events,
      })
      .from(tasks)
      .innerJoin(events, eq(tasks.eventId, events.id))
      .where(and(eq(tasks.id, taskId), eq(events.ownerId, ownerId)))
      .limit(1);

    return task?.task ?? null;
  }

  /**
   * List tasks for event
   * Owner-scoped: validates event ownership
   * Ordered by due date ASC, priority DESC
   */
  async listByEvent(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventId))
      .orderBy(asc(tasks.dueDate), desc(tasks.priority));
  }

  /**
   * Update task
   * Owner-scoped: validates event ownership
   */
  async update(taskId: string, ownerId: string, input: UpdateTaskInput) {
    const [updated] = await this.db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(
            tasks.eventId,
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
   * Delete task
   * Owner-scoped: validates event ownership
   */
  async delete(taskId: string, ownerId: string): Promise<boolean> {
    const task = await this.getById(taskId, ownerId);
    if (!task) return false;

    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning({ id: tasks.id });

    return result.length > 0;
  }

  /**
   * Count open tasks for event
   * Owner-scoped: validates event ownership
   */
  async countOpen(eventId: string, ownerId: string): Promise<number | null> {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    const result = await this.db
      .select({ count: this.db.$count(tasks.id) })
      .from(tasks)
      .where(
        and(eq(tasks.eventId, eventId), eq(tasks.status, 'todo'))
      );

    return result[0]?.count ?? 0;
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
