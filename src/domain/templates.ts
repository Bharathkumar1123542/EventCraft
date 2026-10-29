/**
 * Event type templates with category catalogues
 * Spec: spec.md §4.3, DD-01, DD-02
 */

import type { EventType, CategoryKey } from './types';

export interface CategoryTemplate {
  key: CategoryKey;
  label: string;
  defaultBps: number;
  minBps: number;
  maxBps: number;
  vendorEligible: boolean;
}

export interface EventTemplate {
  horizonDays: number;
  categories: readonly CategoryTemplate[];
}

/**
 * Wedding template (365-day horizon)
 * Default BPS sum: 10,000
 */
const WEDDING_TEMPLATE: EventTemplate = {
  horizonDays: 365,
  categories: [
    {
      key: 'venue',
      label: 'Venue',
      defaultBps: 2400,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'catering',
      label: 'Catering and drinks',
      defaultBps: 2800,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'photography_video',
      label: 'Photo and video',
      defaultBps: 1000,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'attire_beauty',
      label: 'Attire and beauty',
      defaultBps: 800,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'decor_flowers',
      label: 'Decor and flowers',
      defaultBps: 800,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'music_entertainment',
      label: 'Music and entertainment',
      defaultBps: 700,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'invitations_stationery',
      label: 'Invitations and stationery',
      defaultBps: 200,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'transportation',
      label: 'Transportation',
      defaultBps: 300,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'officiant_legal',
      label: 'Officiant and legal fees',
      defaultBps: 200,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'contingency',
      label: 'Contingency',
      defaultBps: 800,
      minBps: 500,
      maxBps: 6000,
      vendorEligible: false,
    },
  ],
};

/**
 * Birthday template (90-day horizon)
 * Default BPS sum: 10,000
 */
const BIRTHDAY_TEMPLATE: EventTemplate = {
  horizonDays: 90,
  categories: [
    {
      key: 'venue',
      label: 'Venue',
      defaultBps: 2500,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'food_cake',
      label: 'Food and cake',
      defaultBps: 3000,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'decor',
      label: 'Decor',
      defaultBps: 1200,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'entertainment',
      label: 'Entertainment and activities',
      defaultBps: 1500,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'party_favors_gifts',
      label: 'Favors and gifts',
      defaultBps: 800,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'invitations',
      label: 'Invitations',
      defaultBps: 200,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'photography',
      label: 'Photography',
      defaultBps: 300,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'contingency',
      label: 'Contingency',
      defaultBps: 500,
      minBps: 500,
      maxBps: 6000,
      vendorEligible: false,
    },
  ],
};

/**
 * Community template (120-day horizon)
 * Default BPS sum: 10,000
 */
const COMMUNITY_TEMPLATE: EventTemplate = {
  horizonDays: 120,
  categories: [
    {
      key: 'venue_permits',
      label: 'Venue and permits',
      defaultBps: 2000,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'av_equipment',
      label: 'Audio-visual equipment',
      defaultBps: 1500,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'catering_refreshments',
      label: 'Food and refreshments',
      defaultBps: 2000,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'marketing_promotion',
      label: 'Marketing and promotion',
      defaultBps: 1200,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'insurance',
      label: 'Insurance',
      defaultBps: 800,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'staffing_volunteers',
      label: 'Staffing and volunteer care',
      defaultBps: 700,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'supplies_logistics',
      label: 'Supplies and logistics',
      defaultBps: 1000,
      minBps: 100,
      maxBps: 6000,
      vendorEligible: true,
    },
    {
      key: 'contingency',
      label: 'Contingency',
      defaultBps: 800,
      minBps: 500,
      maxBps: 6000,
      vendorEligible: false,
    },
  ],
};

/**
 * Template catalogue
 * Only source of valid category keys per event type
 */
export const TEMPLATES: Record<EventType, EventTemplate> = {
  wedding: WEDDING_TEMPLATE,
  birthday: BIRTHDAY_TEMPLATE,
  community: COMMUNITY_TEMPLATE,
};

/**
 * Get all valid category keys for an event type
 */
export function getCategoryKeys(type: EventType): readonly CategoryKey[] {
  return TEMPLATES[type].categories.map((c) => c.key);
}

/**
 * Get a specific category template
 */
export function getCategoryTemplate(
  type: EventType,
  key: CategoryKey
): CategoryTemplate | null {
  return TEMPLATES[type].categories.find((c) => c.key === key) ?? null;
}

/**
 * Check if a category key is valid for an event type
 */
export function isValidCategoryKey(type: EventType, key: string): key is CategoryKey {
  return TEMPLATES[type].categories.some((c) => c.key === key);
}
