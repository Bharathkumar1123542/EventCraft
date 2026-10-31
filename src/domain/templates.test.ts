import { describe, it, expect } from 'vitest';
import { TEMPLATES, getCategoryKeys, getCategoryTemplate, isValidCategoryKey } from './templates';
import type { EventType } from './types';

describe('templates', () => {
  describe('TEMPLATES', () => {
    it('has all three event types', () => {
      expect(TEMPLATES).toHaveProperty('wedding');
      expect(TEMPLATES).toHaveProperty('birthday');
      expect(TEMPLATES).toHaveProperty('community');
    });

    it('has correct horizonDays per type', () => {
      expect(TEMPLATES.wedding.horizonDays).toBe(365);
      expect(TEMPLATES.birthday.horizonDays).toBe(90);
      expect(TEMPLATES.community.horizonDays).toBe(120);
    });

    it('has 10 categories for wedding', () => {
      expect(TEMPLATES.wedding.categories).toHaveLength(10);
    });

    it('has 8 categories for birthday', () => {
      expect(TEMPLATES.birthday.categories).toHaveLength(8);
    });

    it('has 8 categories for community', () => {
      expect(TEMPLATES.community.categories).toHaveLength(8);
    });
  });

  describe('defaultBps validation', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`${type} defaultBps sum to exactly 10,000`, () => {
        const sum = TEMPLATES[type].categories.reduce((acc, cat) => acc + cat.defaultBps, 0);
        expect(sum).toBe(10000);
      });
    });
  });

  describe('category key uniqueness', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`${type} has unique category keys`, () => {
        const keys = TEMPLATES[type].categories.map((c) => c.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      });
    });
  });

  describe('bps ranges', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`${type} has valid bps ranges`, () => {
        TEMPLATES[type].categories.forEach((cat) => {
          // minBps ≤ defaultBps ≤ maxBps
          expect(cat.minBps).toBeLessThanOrEqual(cat.defaultBps);
          expect(cat.defaultBps).toBeLessThanOrEqual(cat.maxBps);

          // Contingency has minBps 500, others have 100
          if (cat.key === 'contingency') {
            expect(cat.minBps).toBe(500);
          } else {
            expect(cat.minBps).toBe(100);
          }

          // All maxBps are 6000
          expect(cat.maxBps).toBe(6000);
        });
      });
    });
  });

  describe('vendor eligibility', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`${type} has contingency as not vendor-eligible`, () => {
        const contingency = TEMPLATES[type].categories.find((c) => c.key === 'contingency');
        expect(contingency).toBeDefined();
        expect(contingency!.vendorEligible).toBe(false);
      });

      it(`${type} has all non-contingency as vendor-eligible`, () => {
        const nonContingency = TEMPLATES[type].categories.filter((c) => c.key !== 'contingency');
        expect(nonContingency.every((c) => c.vendorEligible)).toBe(true);
      });
    });
  });

  describe('category labels', () => {
    const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

    eventTypes.forEach((type) => {
      it(`${type} has non-empty labels`, () => {
        TEMPLATES[type].categories.forEach((cat) => {
          expect(cat.label.length).toBeGreaterThan(0);
          expect(cat.label.trim()).toBe(cat.label);
        });
      });
    });
  });

  describe('getCategoryKeys', () => {
    it('returns all keys for wedding', () => {
      const keys = getCategoryKeys('wedding');
      expect(keys).toHaveLength(10);
      expect(keys).toContain('venue');
      expect(keys).toContain('contingency');
    });

    it('returns all keys for birthday', () => {
      const keys = getCategoryKeys('birthday');
      expect(keys).toHaveLength(8);
      expect(keys).toContain('venue');
      expect(keys).toContain('food_cake');
    });

    it('returns all keys for community', () => {
      const keys = getCategoryKeys('community');
      expect(keys).toHaveLength(8);
      expect(keys).toContain('venue_permits');
      expect(keys).toContain('av_equipment');
    });
  });

  describe('getCategoryTemplate', () => {
    it('returns template for valid key', () => {
      const template = getCategoryTemplate('wedding', 'venue');
      expect(template).not.toBeNull();
      expect(template!.key).toBe('venue');
      expect(template!.label).toBe('Venue');
      expect(template!.defaultBps).toBe(2400);
    });

    it('returns null for invalid key', () => {
      const template = getCategoryTemplate('wedding', 'invalid' as any);
      expect(template).toBeNull();
    });

    it('returns null for key from different event type', () => {
      // food_cake is birthday-only
      const template = getCategoryTemplate('wedding', 'food_cake');
      expect(template).toBeNull();
    });
  });

  describe('isValidCategoryKey', () => {
    it('returns true for valid keys', () => {
      expect(isValidCategoryKey('wedding', 'venue')).toBe(true);
      expect(isValidCategoryKey('wedding', 'contingency')).toBe(true);
      expect(isValidCategoryKey('birthday', 'food_cake')).toBe(true);
      expect(isValidCategoryKey('community', 'venue_permits')).toBe(true);
    });

    it('returns false for invalid keys', () => {
      expect(isValidCategoryKey('wedding', 'invalid')).toBe(false);
      expect(isValidCategoryKey('wedding', '')).toBe(false);
    });

    it('returns false for key from different event type', () => {
      expect(isValidCategoryKey('wedding', 'food_cake')).toBe(false);
      expect(isValidCategoryKey('birthday', 'photography_video')).toBe(false);
      expect(isValidCategoryKey('community', 'catering')).toBe(false);
    });
  });

  describe('wedding categories', () => {
    it('has expected categories in order', () => {
      const keys = getCategoryKeys('wedding');
      expect(keys).toEqual([
        'venue',
        'catering',
        'photography_video',
        'attire_beauty',
        'decor_flowers',
        'music_entertainment',
        'invitations_stationery',
        'transportation',
        'officiant_legal',
        'contingency',
      ]);
    });
  });

  describe('birthday categories', () => {
    it('has expected categories in order', () => {
      const keys = getCategoryKeys('birthday');
      expect(keys).toEqual([
        'venue',
        'food_cake',
        'decor',
        'entertainment',
        'party_favors_gifts',
        'invitations',
        'photography',
        'contingency',
      ]);
    });
  });

  describe('community categories', () => {
    it('has expected categories in order', () => {
      const keys = getCategoryKeys('community');
      expect(keys).toEqual([
        'venue_permits',
        'av_equipment',
        'catering_refreshments',
        'marketing_promotion',
        'insurance',
        'staffing_volunteers',
        'supplies_logistics',
        'contingency',
      ]);
    });
  });
});
