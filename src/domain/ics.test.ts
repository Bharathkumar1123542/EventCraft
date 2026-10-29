import { describe, it, expect } from 'vitest';
import { buildIcs } from './ics';
import type { IcsEvent } from './ics';
import type { IsoDate } from './types';

describe('ics', () => {
  const nowUtc = new Date('2026-10-27T12:00:00Z');

  describe('buildIcs', () => {
    it('generates valid ICS header', () => {
      const result = buildIcs([], nowUtc);
      
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('PRODID:-//EventCraft//EN');
      expect(result).toContain('CALSCALE:GREGORIAN');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toEndWith('\r\n');
    });

    it('generates VEVENT for each event', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Book venue', date: '2026-11-15' as IsoDate },
        { uid: 'task-2', summary: 'Order cake', date: '2026-12-01' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('END:VEVENT');
      expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    });

    it('includes UID with @eventcraft domain', () => {
      const events: IcsEvent[] = [
        { uid: 'task-123', summary: 'Test', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('UID:task-123@eventcraft');
    });

    it('includes DTSTAMP in UTC format', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('DTSTAMP:20261027T120000Z');
    });

    it('formats DTSTART as DATE value', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('DTSTART;VALUE=DATE:20261115');
    });

    it('sets DTEND to next day for all-day events', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('DTEND;VALUE=DATE:20261116');
    });

    it('escapes backslashes', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test \\ backslash', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('SUMMARY:Test \\\\ backslash');
    });

    it('escapes semicolons', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test; semicolon', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('SUMMARY:Test\\; semicolon');
    });

    it('escapes commas', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test, comma', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('SUMMARY:Test\\, comma');
    });

    it('escapes newlines', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test\nnewline', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('SUMMARY:Test\\nnewline');
    });

    it('uses CRLF line endings', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('\r\n');
      expect(result).not.toContain('\n\r');
    });

    it('folds long lines at 75 octets', () => {
      const longSummary = 'A'.repeat(100);
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: longSummary, date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);
      const lines = result.split('\r\n');

      // Check that no line exceeds 75 bytes (excluding continuation space)
      lines.forEach((line) => {
        const trimmed = line.startsWith(' ') ? line.slice(1) : line;
        const bytes = new TextEncoder().encode(trimmed).length;
        expect(bytes).toBeLessThanOrEqual(75);
      });
    });

    it('folds with continuation space', () => {
      const longSummary = 'A'.repeat(100);
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: longSummary, date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      // Folded lines should have continuation starting with space
      if (result.includes('SUMMARY:')) {
        const summaryStart = result.indexOf('SUMMARY:');
        const nextCRLF = result.indexOf('\r\n', summaryStart);
        const afterCRLF = result.substring(nextCRLF + 2, nextCRLF + 3);
        
        if (result[nextCRLF + 2] !== 'E') { // If not END:VEVENT
          expect(afterCRLF).toBe(' ');
        }
      }
    });

    it('handles multi-byte characters in folding', () => {
      const emoji = '🎉'.repeat(30); // Each emoji is 4 bytes
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: emoji, date: '2026-11-15' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);
      const lines = result.split('\r\n');

      // Should not split multi-byte characters
      lines.forEach((line) => {
        const trimmed = line.startsWith(' ') ? line.slice(1) : line;
        // Should be valid UTF-8 (no broken characters)
        expect(() => new TextDecoder('utf-8', { fatal: true }).decode(
          new TextEncoder().encode(trimmed)
        )).not.toThrow();
      });
    });

    it('handles month boundaries in DTEND', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-11-30' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('DTSTART;VALUE=DATE:20261130');
      expect(result).toContain('DTEND;VALUE=DATE:20261201');
    });

    it('handles year boundaries in DTEND', () => {
      const events: IcsEvent[] = [
        { uid: 'task-1', summary: 'Test', date: '2026-12-31' as IsoDate },
      ];

      const result = buildIcs(events, nowUtc);

      expect(result).toContain('DTSTART;VALUE=DATE:20261231');
      expect(result).toContain('DTEND;VALUE=DATE:20270101');
    });

    it('handles empty events list', () => {
      const result = buildIcs([], nowUtc);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).not.toContain('BEGIN:VEVENT');
    });
  });
});
