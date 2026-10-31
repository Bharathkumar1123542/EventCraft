import { describe, it, expect } from 'vitest';
import { FixedClock } from './clock';
import { parseIsoDate, addDays, daysBetween, todayIn, isValidTimeZone } from './dates';
import type { IsoDate } from './types';

describe('dates', () => {
  describe('parseIsoDate', () => {
    it('accepts valid dates', () => {
      expect(parseIsoDate('2026-01-15')).toEqual({ ok: true, value: '2026-01-15' });
      expect(parseIsoDate('2026-12-31')).toEqual({ ok: true, value: '2026-12-31' });
      expect(parseIsoDate('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' }); // Leap year
    });

    it('rejects invalid dates', () => {
      expect(parseIsoDate('2026-02-30')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-13-01')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-00-15')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-01-00')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-01-32')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2025-02-29')).toEqual({ ok: false, error: 'INVALID_DATE' }); // Not leap year
    });

    it('rejects malformed formats', () => {
      expect(parseIsoDate('2026/01/15')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('15-01-2026')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-1-15')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('2026-01-5')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('26-01-15')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('')).toEqual({ ok: false, error: 'INVALID_DATE' });
      expect(parseIsoDate('invalid')).toEqual({ ok: false, error: 'INVALID_DATE' });
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2026-01-15' as IsoDate, 1)).toBe('2026-01-16');
      expect(addDays('2026-01-15' as IsoDate, 7)).toBe('2026-01-22');
      expect(addDays('2026-01-15' as IsoDate, 31)).toBe('2026-02-15');
    });

    it('subtracts negative days', () => {
      expect(addDays('2026-01-15' as IsoDate, -1)).toBe('2026-01-14');
      expect(addDays('2026-01-15' as IsoDate, -15)).toBe('2025-12-31');
    });

    it('handles month boundaries', () => {
      expect(addDays('2026-01-31' as IsoDate, 1)).toBe('2026-02-01');
      expect(addDays('2026-02-01' as IsoDate, -1)).toBe('2026-01-31');
    });

    it('handles leap years', () => {
      expect(addDays('2024-02-28' as IsoDate, 1)).toBe('2024-02-29'); // Leap year
      expect(addDays('2024-02-29' as IsoDate, 1)).toBe('2024-03-01');
      expect(addDays('2025-02-28' as IsoDate, 1)).toBe('2025-03-01'); // Not leap year
    });

    it('handles year boundaries', () => {
      expect(addDays('2025-12-31' as IsoDate, 1)).toBe('2026-01-01');
      expect(addDays('2026-01-01' as IsoDate, -1)).toBe('2025-12-31');
    });

    it('handles zero days', () => {
      expect(addDays('2026-01-15' as IsoDate, 0)).toBe('2026-01-15');
    });

    it('handles large day counts', () => {
      expect(addDays('2026-01-01' as IsoDate, 365)).toBe('2027-01-01');
      expect(addDays('2026-01-01' as IsoDate, -365)).toBe('2025-01-01');
    });
  });

  describe('daysBetween', () => {
    it('calculates positive differences', () => {
      expect(daysBetween('2026-01-01' as IsoDate, '2026-01-02' as IsoDate)).toBe(1);
      expect(daysBetween('2026-01-01' as IsoDate, '2026-01-08' as IsoDate)).toBe(7);
      expect(daysBetween('2026-01-01' as IsoDate, '2026-02-01' as IsoDate)).toBe(31);
    });

    it('calculates negative differences', () => {
      expect(daysBetween('2026-01-02' as IsoDate, '2026-01-01' as IsoDate)).toBe(-1);
      expect(daysBetween('2026-02-01' as IsoDate, '2026-01-01' as IsoDate)).toBe(-31);
    });

    it('returns zero for same date', () => {
      expect(daysBetween('2026-01-15' as IsoDate, '2026-01-15' as IsoDate)).toBe(0);
    });

    it('handles month boundaries', () => {
      expect(daysBetween('2026-01-31' as IsoDate, '2026-02-01' as IsoDate)).toBe(1);
      expect(daysBetween('2026-02-28' as IsoDate, '2026-03-01' as IsoDate)).toBe(1);
    });

    it('handles leap years', () => {
      expect(daysBetween('2024-02-01' as IsoDate, '2024-03-01' as IsoDate)).toBe(29); // Leap year
      expect(daysBetween('2025-02-01' as IsoDate, '2025-03-01' as IsoDate)).toBe(28); // Not leap
    });

    it('handles year boundaries', () => {
      expect(daysBetween('2025-12-31' as IsoDate, '2026-01-01' as IsoDate)).toBe(1);
      expect(daysBetween('2025-01-01' as IsoDate, '2026-01-01' as IsoDate)).toBe(365);
    });

    it('is consistent with addDays', () => {
      const start = '2026-01-15' as IsoDate;
      const days = 42;
      const end = addDays(start, days);
      expect(daysBetween(start, end)).toBe(days);
    });
  });

  describe('todayIn', () => {
    it('returns date in specified timezone', () => {
      // Fixed to 2026-10-27 12:00 UTC
      const clock = new FixedClock(new Date('2026-10-27T12:00:00Z'));

      // UTC
      expect(todayIn(clock, 'UTC')).toBe('2026-10-27');

      // US Eastern (UTC-5 or UTC-4 depending on DST)
      const eastern = todayIn(clock, 'America/New_York');
      expect(eastern).toMatch(/^2026-10-2[67]$/);

      // Tokyo (UTC+9)
      expect(todayIn(clock, 'Asia/Tokyo')).toBe('2026-10-27');
    });

    it('handles DST transitions', () => {
      // DST transition in March (spring forward)
      const springClock = new FixedClock(new Date('2026-03-08T12:00:00Z'));
      const spring = todayIn(springClock, 'America/New_York');
      expect(spring).toBe('2026-03-08');

      // DST transition in November (fall back)
      const fallClock = new FixedClock(new Date('2026-11-01T12:00:00Z'));
      const fall = todayIn(fallClock, 'America/New_York');
      expect(fall).toBe('2026-11-01');
    });

    it('handles edge-of-day times', () => {
      // Just before midnight UTC
      const beforeClock = new FixedClock(new Date('2026-10-27T23:59:00Z'));
      expect(todayIn(beforeClock, 'UTC')).toBe('2026-10-27');

      // Just after midnight UTC
      const afterClock = new FixedClock(new Date('2026-10-28T00:01:00Z'));
      expect(todayIn(afterClock, 'UTC')).toBe('2026-10-28');
    });

    it('handles various timezones', () => {
      const clock = new FixedClock(new Date('2026-10-27T12:00:00Z'));

      // Asia/Kolkata (IST, UTC+5:30)
      expect(todayIn(clock, 'Asia/Kolkata')).toBe('2026-10-27');

      // Pacific/Kiritimati (UTC+14, earliest timezone)
      expect(todayIn(clock, 'Pacific/Kiritimati')).toBe('2026-10-28');

      // Pacific/Midway (UTC-11)
      expect(todayIn(clock, 'Pacific/Midway')).toBe('2026-10-27');
    });
  });

  describe('isValidTimeZone', () => {
    it('accepts valid timezones', () => {
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('America/New_York')).toBe(true);
      expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
      expect(isValidTimeZone('Europe/London')).toBe(true);
      expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
      expect(isValidTimeZone('Pacific/Kiritimati')).toBe(true);
    });

    it('rejects invalid timezones', () => {
      expect(isValidTimeZone('Invalid/Zone')).toBe(false);
      expect(isValidTimeZone('EST')).toBe(false); // Abbreviations not accepted
      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone('America/Nowhere')).toBe(false);
    });
  });
});
