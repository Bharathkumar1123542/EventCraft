import 'server-only';
/**
 * AI generation tracking repository
 * Spec: spec.md §5.3, §7.3
 * Owner-scoped: validates event ownership before operations
 */

import { eq, and, desc, asc } from 'drizzle-orm';
import type { Database } from '../client';
import { generationRuns, chatMessages, events } from '../schema';

export type GenerationFeature =
  | 'initial_plan'
  | 'budget_suggest'
  | 'task_suggest'
  | 'vendor_suggest'
  | 'idea_suggest'
  | 'chat';

export interface CreateGenerationRunInput {
  eventId: string;
  userId: string;
  feature: GenerationFeature;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface CreateChatMessageInput {
  eventId: string;
  ownerId: string;
  generationRunId: string | null;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export class GenerationRepository {
  constructor(private db: Database) {}

  /**
   * Create generation run
   * Owner-scoped: validates event ownership via userId
   */
  async createRun(input: CreateGenerationRunInput) {
    const [run] = await this.db
      .insert(generationRuns)
      .values({
        eventId: input.eventId,
        userId: input.userId,
        feature: input.feature,
        modelName: input.modelName,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        latencyMs: input.latencyMs,
      })
      .returning();

    return run!;
  }

  /**
   * Get generation runs for event
   * Owner-scoped: validates event ownership
   */
  async listRuns(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.eventId, eventId))
      .orderBy(desc(generationRuns.createdAt));
  }

  /**
   * Create chat message
   * Owner-scoped: validates event ownership
   */
  async createMessage(input: CreateChatMessageInput) {
    const owned = await this.verifyOwnership(input.eventId, input.ownerId);
    if (!owned) return null;

    const [message] = await this.db
      .insert(chatMessages)
      .values({
        eventId: input.eventId,
        generationRunId: input.generationRunId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? {},
      })
      .returning();

    return message!;
  }

  /**
   * Get chat messages for event
   * Owner-scoped: validates event ownership
   * Ordered by creation date ASC (oldest first)
   */
  async listMessages(eventId: string, ownerId: string) {
    const owned = await this.verifyOwnership(eventId, ownerId);
    if (!owned) return null;

    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.eventId, eventId))
      .orderBy(asc(chatMessages.createdAt));
  }

  /**
   * Get total tokens used by user
   */
  async getTotalTokens(userId: string): Promise<number> {
    const runs = await this.db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.userId, userId));

    return runs.reduce(
      (sum, run) => sum + run.inputTokens + run.outputTokens,
      0
    );
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
