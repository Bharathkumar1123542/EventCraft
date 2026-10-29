/**
 * Markdown and snapshot export functions
 * Spec: spec.md §4.6
 */

import type { EventType, IsoDate, CategoryKey, Priority } from './types';

export interface PlanEvent {
  type: EventType;
  title: string;
  eventDate: IsoDate;
  guestCount: number;
  city: string | null;
}

export interface BudgetItem {
  label: string;
  allocatedMinor: number;
  committedMinor: number;
  paidMinor: number;
  remainingMinor: number;
  status: 'ok' | 'near_limit' | 'over';
}

export interface TaskItem {
  title: string;
  dueDate: IsoDate;
  priority: Priority;
  status: 'todo' | 'in_progress' | 'done';
}

export interface VendorItem {
  need: string;
  questions: readonly string[];
  isMustHave: boolean;
}

export interface IdeaItem {
  title: string;
  description: string;
}

/**
 * Build Markdown plan summary
 * Spec: spec.md §4.6
 */
export function buildPlanMarkdown(
  event: PlanEvent,
  budget: readonly BudgetItem[],
  tasks: readonly TaskItem[],
  vendors: readonly VendorItem[],
  ideas: readonly IdeaItem[],
  currency: string
): string {
  const sections: string[] = [];

  // Event facts
  sections.push('# Event Plan\n');
  sections.push(`**Type:** ${capitalize(event.type)}`);
  sections.push(`**Title:** ${event.title}`);
  sections.push(`**Date:** ${event.eventDate}`);
  sections.push(`**Guests:** ${event.guestCount}`);
  if (event.city) {
    sections.push(`**Location:** ${event.city}`);
  }
  sections.push('');

  // Budget table
  sections.push('## Budget\n');
  sections.push('| Category | Allocated | Committed | Paid | Remaining | Status |');
  sections.push('|----------|-----------|-----------|------|-----------|--------|');
  
  budget.forEach((item) => {
    const allocated = formatAmount(item.allocatedMinor, currency);
    const committed = formatAmount(item.committedMinor, currency);
    const paid = formatAmount(item.paidMinor, currency);
    const remaining = formatAmount(item.remainingMinor, currency);
    const status = capitalize(item.status.replace('_', ' '));
    
    sections.push(
      `| ${escapeMarkdown(item.label)} | ${allocated} | ${committed} | ${paid} | ${remaining} | ${status} |`
    );
  });
  sections.push('');

  // Open tasks
  const openTasks = tasks.filter((t) => t.status !== 'done');
  if (openTasks.length > 0) {
    sections.push('## Tasks\n');
    openTasks.forEach((task) => {
      const priority = task.priority.toUpperCase();
      sections.push(`- **[${priority}]** ${escapeMarkdown(task.title)} (${task.dueDate})`);
    });
    sections.push('');
  }

  // Vendor checklist
  if (vendors.length > 0) {
    sections.push('## Vendor Checklist\n');
    vendors.forEach((vendor) => {
      const mustHave = vendor.isMustHave ? ' *(must-have)*' : '';
      sections.push(`### ${escapeMarkdown(vendor.need)}${mustHave}\n`);
      sections.push('Questions to ask:');
      vendor.questions.forEach((q) => {
        sections.push(`- ${escapeMarkdown(q)}`);
      });
      sections.push('');
    });
  }

  // Saved ideas
  if (ideas.length > 0) {
    sections.push('## Ideas\n');
    ideas.forEach((idea) => {
      sections.push(`### ${escapeMarkdown(idea.title)}\n`);
      sections.push(escapeMarkdown(idea.description));
      sections.push('');
    });
  }

  return sections.join('\n');
}

/**
 * Build plan snapshot for AI assistant
 * Privacy-filtered: only allowed fields
 * Spec: spec.md §4.6, §7.4
 */
export interface SnapshotTask {
  title: string;
  dueDate: IsoDate;
  priority: Priority;
  status: 'todo' | 'in_progress' | 'done';
  categoryKey: CategoryKey | null;
}

export interface SnapshotVendor {
  need: string;
  categoryKey: CategoryKey;
  status: 'not_started' | 'contacted' | 'quoted' | 'booked' | 'declined';
  isMustHave: boolean;
}

export interface SnapshotIdea {
  kind: string;
  title: string;
  costTier: string;
}

export interface PlanSnapshot {
  eventType: EventType;
  eventDate: IsoDate;
  guestCount: number;
  city: string | null;
  daysUntilEvent: number;
  currency: string;
  totalBudgetMinor: number;
  categories: Array<{
    key: CategoryKey;
    label: string;
    allocatedMinor: number;
    committedMinor: number;
    paidMinor: number;
    status: 'ok' | 'near_limit' | 'over';
  }>;
  openTasks: SnapshotTask[]; // Max 25
  vendors: SnapshotVendor[]; // Max 30
  savedIdeas: SnapshotIdea[]; // Max 10
}

/**
 * Build plan snapshot
 * Limits: 25 open tasks (earliest due first), 30 vendors, 10 saved ideas
 */
export function buildPlanSnapshot(
  event: PlanEvent & { currency: string; totalBudgetMinor: number },
  budget: readonly BudgetItem[] & { 0: BudgetItem & { key: CategoryKey; label: string } },
  tasks: readonly SnapshotTask[],
  vendors: readonly SnapshotVendor[],
  ideas: readonly SnapshotIdea[],
  today: IsoDate
): PlanSnapshot {
  const openTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 25);

  const savedIdeas = ideas.slice(0, 10);
  const vendorsList = vendors.slice(0, 30);

  // Calculate days until event
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = event.eventDate.split('-').map(Number);
  const todayNum = Math.floor(Date.UTC(y1!, m1! - 1, d1!) / 86_400_000);
  const eventNum = Math.floor(Date.UTC(y2!, m2! - 1, d2!) / 86_400_000);
  const daysUntilEvent = eventNum - todayNum;

  return {
    eventType: event.type,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    city: event.city,
    daysUntilEvent,
    currency: event.currency,
    totalBudgetMinor: event.totalBudgetMinor,
    categories: budget as any,
    openTasks,
    vendors: vendorsList,
    savedIdeas,
  };
}

// Helper functions

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAmount(minor: number, currency: string): string {
  const exponents: Record<string, number> = {
    USD: 2,
    EUR: 2,
    GBP: 2,
    INR: 2,
    CAD: 2,
    AUD: 2,
    JPY: 0,
  };
  const exp = exponents[currency] ?? 2;
  const major = minor / Math.pow(10, exp);
  return major.toFixed(exp);
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
