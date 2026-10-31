import 'server-only';
/**
 * Input sanitizer
 * Spec: spec.md §7.2
 * Removes control characters, trims whitespace, enforces length limits
 */

/**
 * Sanitize string input
 * - Removes control characters (except newline/tab)
 * - Trims leading/trailing whitespace
 * - Enforces max length
 */
export function sanitizeString(
  input: string,
  maxLength = 1000
): string {
  // Remove control characters except \n and \t
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize multiline text input (notes, descriptions)
 * Allows newlines, enforces max length
 */
export function sanitizeText(
  input: string,
  maxLength = 5000
): string {
  return sanitizeString(input, maxLength);
}

/**
 * Sanitize title/label (single line)
 * Removes newlines, enforces shorter max length
 */
export function sanitizeTitle(
  input: string,
  maxLength = 200
): string {
  // Remove all newlines and tabs
  let sanitized = input.replace(/[\n\r\t]/g, ' ');
  
  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitizeString(sanitized, maxLength);
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  input: readonly string[],
  maxItems = 100,
  maxLength = 500
): string[] {
  return input
    .slice(0, maxItems)
    .map((item) => sanitizeString(item, maxLength))
    .filter((item) => item.length > 0);
}

/**
 * Sanitize email (basic validation + lowercase)
 */
export function sanitizeEmail(input: string): string {
  const sanitized = sanitizeString(input, 320).toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Sanitize object by applying sanitizer to string fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  input: T,
  fieldSanitizers: Partial<Record<keyof T, (val: unknown) => unknown>>
): T {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(input)) {
    const sanitizer = fieldSanitizers[key as keyof T];
    
    if (sanitizer) {
      result[key] = sanitizer(value);
    } else if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}
