/**
 * ICS (iCalendar) export - RFC 5545
 * Spec: spec.md §4.6
 */

import type { IsoDate } from './types';

export interface IcsEvent {
  uid: string;
  summary: string;
  date: IsoDate;
}

/**
 * Build ICS calendar file
 * RFC 5545 with 75-octet line folding
 */
export function buildIcs(events: readonly IcsEvent[], nowUtc: Date): string {
  const lines: string[] = [];

  // Header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//EventCraft//EN');
  lines.push('CALSCALE:GREGORIAN');

  // Events
  events.forEach((event) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}@eventcraft`);
    lines.push(`DTSTAMP:${formatIcsDateTime(nowUtc)}`);
    lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`);
    
    // End date is the next day for all-day events
    const [y, m, d] = event.date.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y!, m! - 1, d! + 1));
    const endDate = formatIcsDate(nextDay);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
    
    lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  // Fold lines at 75 octets
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Format UTC datetime for ICS (YYYYMMDDTHHMMSSZ)
 */
function formatIcsDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Format date for ICS (YYYYMMDD)
 */
function formatIcsDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Escape special characters for ICS text
 * \ → \\, ; → \;, , → \,, newline → \n
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Fold line at 75 octets (UTF-8 byte count)
 * Continuation lines start with one space
 * Never splits multi-byte characters
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= 75) {
    return line;
  }

  const result: string[] = [];
  let currentLine = '';
  let currentBytes = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    const charBytes = encoder.encode(char).length;

    // Check if adding this character would exceed 75 bytes
    const targetLimit = result.length === 0 ? 75 : 74; // First line: 75, continuation: 74 (space + 74)

    if (currentBytes + charBytes > targetLimit && currentLine.length > 0) {
      result.push(currentLine);
      currentLine = char;
      currentBytes = charBytes;
    } else {
      currentLine += char;
      currentBytes += charBytes;
    }
  }

  if (currentLine.length > 0) {
    result.push(currentLine);
  }

  // Join with CRLF + space for continuation
  return result.join('\r\n ');
}
