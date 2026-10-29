import 'server-only';
/**
 * HTTP request logger
 * Spec: spec.md §6.3
 */

import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  method?: string | undefined;
  path?: string | undefined;
  status?: number | undefined;
  durationMs?: number | undefined;
  userId?: string | undefined;
  error?: Error | undefined;
  [key: string]: unknown;
}

/**
 * Log with level and context
 */
export function log(level: LogLevel, message: string, context?: LogContext) {
  // Skip debug logs in production unless LOG_LEVEL is debug
  if (level === 'debug' && env.NODE_ENV === 'production' && env.LOG_LEVEL !== 'debug') {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // In production, use JSON logging for structured logs
  if (env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    // In development, use human-readable format
    const contextStr = context
      ? ' ' + JSON.stringify(context, null, 2)
      : '';
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`);
  }
}

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  userId?: string
) {
  log('info', 'HTTP request', {
    method,
    path,
    status,
    durationMs,
    userId,
  });
}

/**
 * Log error
 */
export function logError(message: string, error: Error, context?: LogContext) {
  const errorObj: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if (error.stack !== undefined) {
    errorObj.stack = error.stack;
  }
  log('error', message, {
    ...context,
    error: errorObj as Error,
  });
}

/**
 * Log info
 */
export function logInfo(message: string, context?: LogContext) {
  log('info', message, context);
}

/**
 * Log warning
 */
export function logWarn(message: string, context?: LogContext) {
  log('warn', message, context);
}

/**
 * Log debug
 */
export function logDebug(message: string, context?: LogContext) {
  log('debug', message, context);
}
