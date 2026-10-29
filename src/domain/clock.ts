/**
 * Clock interface for time injection
 * Spec: spec.md §3, §4.2
 */

import type { Clock } from './types';

/**
 * Real clock using system time
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Fixed clock for testing
 */
export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}
