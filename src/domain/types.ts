/**
 * Domain types and branded types
 * No imports allowed in domain layer
 */

// Branded type for ISO date strings
export type IsoDate = string & { readonly __brand: 'IsoDate' };

// Result type for domain operations
export type Result<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Event types
export type EventType = 'wedding' | 'birthday' | 'community';

// Priority levels
export type Priority = 'low' | 'medium' | 'high';

// Currency codes
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';

// Category keys (union of all possible keys across event types)
export type CategoryKey =
  // Wedding
  | 'venue'
  | 'catering'
  | 'photography_video'
  | 'attire_beauty'
  | 'decor_flowers'
  | 'music_entertainment'
  | 'invitations_stationery'
  | 'transportation'
  | 'officiant_legal'
  // Birthday
  | 'food_cake'
  | 'decor'
  | 'entertainment'
  | 'party_favors_gifts'
  | 'invitations'
  | 'photography'
  // Community
  | 'venue_permits'
  | 'av_equipment'
  | 'catering_refreshments'
  | 'marketing_promotion'
  | 'insurance'
  | 'staffing_volunteers'
  | 'supplies_logistics'
  // Shared
  | 'contingency';

// Clock interface for time injection
export interface Clock {
  now(): Date;
}
