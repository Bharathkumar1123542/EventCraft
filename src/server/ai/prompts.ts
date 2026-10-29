import 'server-only';
/**
 * AI prompts
 * Spec: spec.md §7.1
 */

import type { EventType, CurrencyCode } from '@/domain/types';

export function buildInitialPlanPrompt(input: {
  type: EventType;
  eventDate: string;
  guestCount: number;
  city: string | null;
  totalBudgetMinor: number;
  currency: Currency;
  userPrompt: string;
}): string {
  const budgetFormatted = (input.totalBudgetMinor / 100).toFixed(2);
  const cityPart = input.city ? ` in ${input.city}` : '';

  return `You are an expert event planner. Generate a comprehensive plan for a ${input.type} event${cityPart}.

Event details:
- Type: ${input.type}
- Date: ${input.eventDate}
- Guest count: ${input.guestCount}
- Total budget: ${budgetFormatted} ${input.currency}

User request: ${input.userPrompt}

Generate:
1. Event title (concise, descriptive)
2. Budget allocation across categories (must sum to total budget)
3. Priority tasks with due dates
4. Vendor needs with evaluation questions

Be specific and practical. Consider cultural norms for this event type. Budget percentages should be realistic.`;
}

export function buildBudgetSuggestionPrompt(input: {
  type: EventType;
  guestCount: number;
  totalBudgetMinor: number;
  currency: Currency;
  currentCategories: Array<{ categoryKey: string; allocatedMinor: number }>;
}): string {
  const budgetFormatted = (input.totalBudgetMinor / 100).toFixed(2);
  const currentAllocation = input.currentCategories
    .map(
      (c) =>
        `- ${c.categoryKey}: ${(c.allocatedMinor / 100).toFixed(2)} ${input.currency}`
    )
    .join('\n');

  return `Review and suggest improvements to this event budget allocation.

Event: ${input.type} with ${input.guestCount} guests
Total budget: ${budgetFormatted} ${input.currency}

Current allocation:
${currentAllocation}

Suggest adjustments that:
- Keep the same total (${budgetFormatted} ${input.currency})
- Are more balanced for this event type
- Account for typical cost drivers

Return the full allocation (all categories, not just changes).`;
}

export function buildTaskSuggestionPrompt(input: {
  type: EventType;
  eventDate: string;
  guestCount: number;
  existingTasks: Array<{ title: string }>;
}): string {
  const existing = input.existingTasks.map((t) => `- ${t.title}`).join('\n');

  return `Suggest additional tasks for a ${input.type} event on ${input.eventDate} with ${input.guestCount} guests.

Existing tasks:
${existing || '(none yet)'}

Suggest 3-5 tasks that:
- Fill gaps in the existing list
- Have appropriate due dates (working backwards from ${input.eventDate})
- Are prioritized by importance

Focus on tasks often overlooked by planners.`;
}

export function buildVendorSuggestionPrompt(input: {
  type: EventType;
  guestCount: number;
  budgetCategories: Array<{ categoryKey: string; allocatedMinor: number }>;
  existingVendors: Array<{ need: string }>;
}): string {
  const existing = input.existingVendors.map((v) => `- ${v.need}`).join('\n');
  const categories = input.budgetCategories
    .map((c) => c.categoryKey)
    .join(', ');

  return `Suggest vendors needed for a ${input.type} event with ${input.guestCount} guests.

Budget categories: ${categories}

Existing vendors:
${existing || '(none yet)'}

Suggest 3-5 vendor needs that:
- Fill gaps in existing list
- Match budget categories
- Are critical for this event type
- Include 2-3 evaluation questions per vendor

Mark must-have vendors vs nice-to-have.`;
}

export function buildIdeaSuggestionPrompt(input: {
  type: EventType;
  guestCount: number;
  city: string | null;
  preferences: Record<string, unknown>;
}): string {
  const cityPart = input.city ? ` in ${input.city}` : '';
  const prefsPart =
    Object.keys(input.preferences).length > 0
      ? `\n\nPreferences: ${JSON.stringify(input.preferences, null, 2)}`
      : '';

  return `Suggest creative ideas for a ${input.type} event${cityPart} with ${input.guestCount} guests.${prefsPart}

Provide 5-8 ideas across different categories:
- Activities/entertainment
- Food & beverage
- Decor/ambiance
- Guest experiences
- Memorable touches

For each idea:
- Brief title
- Description (2-3 sentences)
- Cost tier (budget-friendly, moderate, premium)
- Why it works for this event type`;
}
