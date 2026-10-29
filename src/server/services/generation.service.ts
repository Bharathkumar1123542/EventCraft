import 'server-only';
/**
 * AI generation service
 * Spec: spec.md §7.1
 */

import type { Database } from '../db/client';
import type { CategoryKey } from '@/domain/types';
import {
  EventsRepository,
  BudgetRepository,
  TasksRepository,
  VendorsRepository,
  IdeasRepository,
  GenerationRepository,
} from '../db/repositories';
import { generateStructured } from '../ai/generate';
import {
  initialPlanSchema,
  budgetSuggestionSchema,
  taskSuggestionSchema,
  vendorSuggestionSchema,
  ideaSuggestionSchema,
} from '../ai/schemas';
import type {
  InitialPlanOutput,
  BudgetSuggestionOutput,
  TaskSuggestionOutput,
  VendorSuggestionOutput,
  IdeaSuggestionOutput,
} from '../ai/schemas';
import {
  buildInitialPlanPrompt,
  buildBudgetSuggestionPrompt,
  buildTaskSuggestionPrompt,
  buildVendorSuggestionPrompt,
  buildIdeaSuggestionPrompt,
} from '../ai/prompts';
import type { EventType, Currency } from '@/domain/types';

export class GenerationService {
  constructor(private db: Database) {}

  /**
   * Generate initial plan
   * Spec: spec.md §9.1
   */
  async generateInitialPlan(input: {
    userId: string;
    type: EventType;
    eventDate: string;
    timezone: string;
    city: string | null;
    guestCount: number;
    currency: Currency;
    totalBudgetMinor: number;
    userPrompt: string;
    preferences: Record<string, unknown>;
  }): Promise<{ eventId: string }> {
    // Generate plan
    const prompt = buildInitialPlanPrompt(input);
    const result = await generateStructured<InitialPlanOutput>(
      'initial_plan',
      prompt,
      initialPlanSchema
    );

    // Create event
    const eventsRepo = new EventsRepository(this.db);
    const event = await eventsRepo.create({
      ownerId: input.userId,
      type: input.type,
      title: result.data.title,
      eventDate: input.eventDate,
      timezone: input.timezone,
      city: input.city,
      guestCount: input.guestCount,
      currency: input.currency,
      totalBudgetMinor: input.totalBudgetMinor,
      preferences: input.preferences,
    });

    // Set budget categories
    const budgetRepo = new BudgetRepository(this.db);
    await budgetRepo.setCategories({
      eventId: event.id,
      ownerId: input.userId,
      categories: result.data.budgetCategories,
    });

    // Create tasks
    const tasksRepo = new TasksRepository(this.db);
    for (const task of result.data.tasks) {
      await tasksRepo.create({
        eventId: event.id,
        ownerId: input.userId,
        title: task.title,
        categoryKey: task.categoryKey as CategoryKey | null,
        dueDate: task.dueDate,
        priority: task.priority,
      });
    }

    // Create vendors
    const vendorsRepo = new VendorsRepository(this.db);
    for (const vendor of result.data.vendors) {
      await vendorsRepo.create({
        eventId: event.id,
        ownerId: input.userId,
        categoryKey: vendor.categoryKey as CategoryKey,
        need: vendor.need,
        questions: vendor.questions,
        isMustHave: vendor.isMustHave,
      });
    }

    // Track generation
    const genRepo = new GenerationRepository(this.db);
    await genRepo.createRun({
      eventId: event.id,
      userId: input.userId,
      feature: 'initial_plan',
      modelName: result.modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
    });

    return { eventId: event.id };
  }

  /**
   * Suggest budget adjustments
   * Spec: spec.md §9.2
   */
  async suggestBudget(input: {
    eventId: string;
    userId: string;
  }): Promise<BudgetSuggestionOutput> {
    // Get event
    const eventsRepo = new EventsRepository(this.db);
    const event = await eventsRepo.getById(input.eventId, input.userId);
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Get current budget
    const budgetRepo = new BudgetRepository(this.db);
    const currentCategories = await budgetRepo.getCategories(
      input.eventId,
      input.userId
    );
    
    if (!currentCategories) {
      throw new Error('Budget not found');
    }

    // Generate suggestions
    const prompt = buildBudgetSuggestionPrompt({
      type: event.type,
      guestCount: event.guestCount,
      totalBudgetMinor: event.totalBudgetMinor,
      currency: event.currency,
      currentCategories: currentCategories.map((c) => ({
        categoryKey: c.categoryKey,
        allocatedMinor: c.allocatedMinor,
      })),
    });

    const result = await generateStructured<BudgetSuggestionOutput>(
      'budget_suggest',
      prompt,
      budgetSuggestionSchema
    );

    // Track generation
    const genRepo = new GenerationRepository(this.db);
    await genRepo.createRun({
      eventId: input.eventId,
      userId: input.userId,
      feature: 'budget_suggest',
      modelName: result.modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
    });

    return result.data;
  }

  /**
   * Suggest additional tasks
   * Spec: spec.md §9.3
   */
  async suggestTasks(input: {
    eventId: string;
    userId: string;
  }): Promise<TaskSuggestionOutput> {
    // Get event
    const eventsRepo = new EventsRepository(this.db);
    const event = await eventsRepo.getById(input.eventId, input.userId);
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Get existing tasks
    const tasksRepo = new TasksRepository(this.db);
    const existingTasks = await tasksRepo.listByEvent(input.eventId, input.userId);
    
    if (!existingTasks) {
      throw new Error('Tasks not found');
    }

    // Generate suggestions
    const prompt = buildTaskSuggestionPrompt({
      type: event.type,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
      existingTasks: existingTasks.map((t) => ({ title: t.title })),
    });

    const result = await generateStructured<TaskSuggestionOutput>(
      'task_suggest',
      prompt,
      taskSuggestionSchema
    );

    // Track generation
    const genRepo = new GenerationRepository(this.db);
    await genRepo.createRun({
      eventId: input.eventId,
      userId: input.userId,
      feature: 'task_suggest',
      modelName: result.modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
    });

    return result.data;
  }

  /**
   * Suggest vendors
   * Spec: spec.md §9.4
   */
  async suggestVendors(input: {
    eventId: string;
    userId: string;
  }): Promise<VendorSuggestionOutput> {
    // Get event
    const eventsRepo = new EventsRepository(this.db);
    const event = await eventsRepo.getById(input.eventId, input.userId);
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Get budget categories
    const budgetRepo = new BudgetRepository(this.db);
    const budgetCategories = await budgetRepo.getCategories(
      input.eventId,
      input.userId
    );
    
    if (!budgetCategories) {
      throw new Error('Budget not found');
    }

    // Get existing vendors
    const vendorsRepo = new VendorsRepository(this.db);
    const existingVendors = await vendorsRepo.listByEvent(
      input.eventId,
      input.userId
    );
    
    if (!existingVendors) {
      throw new Error('Vendors not found');
    }

    // Generate suggestions
    const prompt = buildVendorSuggestionPrompt({
      type: event.type,
      guestCount: event.guestCount,
      budgetCategories: budgetCategories.map((c) => ({
        categoryKey: c.categoryKey,
        allocatedMinor: c.allocatedMinor,
      })),
      existingVendors: existingVendors.map((v) => ({ need: v.need })),
    });

    const result = await generateStructured<VendorSuggestionOutput>(
      'vendor_suggest',
      prompt,
      vendorSuggestionSchema
    );

    // Track generation
    const genRepo = new GenerationRepository(this.db);
    await genRepo.createRun({
      eventId: input.eventId,
      userId: input.userId,
      feature: 'vendor_suggest',
      modelName: result.modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
    });

    return result.data;
  }

  /**
   * Suggest ideas
   * Spec: spec.md §9.5
   */
  async suggestIdeas(input: {
    eventId: string;
    userId: string;
  }): Promise<IdeaSuggestionOutput> {
    // Get event
    const eventsRepo = new EventsRepository(this.db);
    const event = await eventsRepo.getById(input.eventId, input.userId);
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Generate suggestions
    const prompt = buildIdeaSuggestionPrompt({
      type: event.type,
      guestCount: event.guestCount,
      city: event.city,
      preferences: event.preferences as Record<string, unknown>,
    });

    const result = await generateStructured<IdeaSuggestionOutput>(
      'idea_suggest',
      prompt,
      ideaSuggestionSchema
    );

    // Track generation
    const genRepo = new GenerationRepository(this.db);
    await genRepo.createRun({
      eventId: input.eventId,
      userId: input.userId,
      feature: 'idea_suggest',
      modelName: result.modelName,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
    });

    return result.data;
  }
}
