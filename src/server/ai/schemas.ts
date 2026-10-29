import 'server-only';
/**
 * AI output schemas (JSON Schema format for Claude tool use)
 * Spec: spec.md §7.1
 */

export const initialPlanSchema = {
  name: 'generate_initial_plan',
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Event title (concise, descriptive)',
      },
      budgetCategories: {
        type: 'array',
        description: 'Budget allocation (must sum to total)',
        items: {
          type: 'object',
          properties: {
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
            },
            allocatedMinor: {
              type: 'integer',
              description: 'Amount in minor units (cents)',
            },
          },
          required: ['categoryKey', 'allocatedMinor'],
        },
      },
      tasks: {
        type: 'array',
        description: 'Priority tasks',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
              nullable: true,
            },
            dueDate: {
              type: 'string',
              description: 'ISO date (YYYY-MM-DD)',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
          },
          required: ['title', 'dueDate', 'priority'],
        },
      },
      vendors: {
        type: 'array',
        description: 'Vendor needs',
        items: {
          type: 'object',
          properties: {
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
            },
            need: { type: 'string' },
            questions: {
              type: 'array',
              items: { type: 'string' },
            },
            isMustHave: { type: 'boolean' },
          },
          required: ['categoryKey', 'need', 'questions', 'isMustHave'],
        },
      },
    },
    required: ['title', 'budgetCategories', 'tasks', 'vendors'],
  },
};

export const budgetSuggestionSchema = {
  name: 'suggest_budget',
  schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
            },
            allocatedMinor: { type: 'integer' },
          },
          required: ['categoryKey', 'allocatedMinor'],
        },
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of changes',
      },
    },
    required: ['categories', 'reasoning'],
  },
};

export const taskSuggestionSchema = {
  name: 'suggest_tasks',
  schema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
              nullable: true,
            },
            dueDate: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            notes: { type: 'string', nullable: true },
          },
          required: ['title', 'dueDate', 'priority'],
        },
      },
    },
    required: ['tasks'],
  },
};

export const vendorSuggestionSchema = {
  name: 'suggest_vendors',
  schema: {
    type: 'object',
    properties: {
      vendors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
            },
            need: { type: 'string' },
            questions: {
              type: 'array',
              items: { type: 'string' },
            },
            isMustHave: { type: 'boolean' },
          },
          required: ['categoryKey', 'need', 'questions', 'isMustHave'],
        },
      },
    },
    required: ['vendors'],
  },
};

export const ideaSuggestionSchema = {
  name: 'suggest_ideas',
  schema: {
    type: 'object',
    properties: {
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            costTier: {
              type: 'string',
              enum: ['budget-friendly', 'moderate', 'premium'],
            },
            categoryKey: {
              type: 'string',
              enum: [
                'venue',
                'catering',
                'decor',
                'entertainment',
                'photography',
                'attire',
                'invitations',
                'gifts',
                'transport',
                'accommodation',
                'other',
              ],
              nullable: true,
            },
          },
          required: ['kind', 'title', 'description', 'costTier'],
        },
      },
    },
    required: ['ideas'],
  },
};

// Type exports
export type InitialPlanOutput = {
  title: string;
  budgetCategories: Array<{
    categoryKey: string;
    allocatedMinor: number;
  }>;
  tasks: Array<{
    title: string;
    categoryKey: string | null;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  vendors: Array<{
    categoryKey: string;
    need: string;
    questions: string[];
    isMustHave: boolean;
  }>;
};

export type BudgetSuggestionOutput = {
  categories: Array<{
    categoryKey: string;
    allocatedMinor: number;
  }>;
  reasoning: string;
};

export type TaskSuggestionOutput = {
  tasks: Array<{
    title: string;
    categoryKey: string | null;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    notes?: string | null;
  }>;
};

export type VendorSuggestionOutput = {
  vendors: Array<{
    categoryKey: string;
    need: string;
    questions: string[];
    isMustHave: boolean;
  }>;
};

export type IdeaSuggestionOutput = {
  ideas: Array<{
    kind: string;
    title: string;
    description: string;
    costTier: string;
    categoryKey: string | null;
  }>;
};
