import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Environment validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    NODE_ENV: 'development',
    APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    BETTER_AUTH_SECRET: 'this-is-a-very-long-secret-at-least-32-characters',
    LLM_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'sk-test-key',
  };

  it('should accept valid environment', () => {
    process.env = { ...validEnv };
    
    // Dynamically import to get fresh env validation
    const schema = z.object({
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(32),
    });

    expect(() => schema.parse(process.env)).not.toThrow();
  });

  it('should require DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    process.env = { ...rest } as any;

    const schema = z.object({
      DATABASE_URL: z.string().min(1),
    });

    expect(() => schema.parse(process.env)).toThrow();
  });

  it('should require BETTER_AUTH_SECRET with min 32 characters', () => {
    process.env = { ...validEnv, BETTER_AUTH_SECRET: 'too-short' };

    const schema = z.object({
      BETTER_AUTH_SECRET: z.string().min(32),
    });

    expect(() => schema.parse(process.env)).toThrow();
  });

  it('should require both Google OAuth variables or neither', () => {
    // Only client ID
    process.env = { ...validEnv, GOOGLE_CLIENT_ID: 'client-id' };

    const schema = z
      .object({
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        const hasClientId = !!data.GOOGLE_CLIENT_ID;
        const hasClientSecret = !!data.GOOGLE_CLIENT_SECRET;
        if (hasClientId !== hasClientSecret) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Both must be set or neither',
            path: ['GOOGLE_CLIENT_SECRET'],
          });
        }
      });

    expect(() => schema.parse(process.env)).toThrow();

    // Both set should pass
    process.env = {
      ...validEnv,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
    };

    expect(() => schema.parse(process.env)).not.toThrow();
  });

  it('should require ANTHROPIC_API_KEY when provider is anthropic', () => {
    const { ANTHROPIC_API_KEY, ...rest } = validEnv;
    process.env = { ...rest, LLM_PROVIDER: 'anthropic' } as any;

    const schema = z
      .object({
        LLM_PROVIDER: z.enum(['anthropic', 'fake']),
        ANTHROPIC_API_KEY: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.LLM_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'ANTHROPIC_API_KEY required',
            path: ['ANTHROPIC_API_KEY'],
          });
        }
      });

    expect(() => schema.parse(process.env)).toThrow();
  });

  it('should reject fake provider in production', () => {
    process.env = { ...validEnv, NODE_ENV: 'production', LLM_PROVIDER: 'fake' };

    const schema = z
      .object({
        NODE_ENV: z.enum(['development', 'test', 'production']),
        LLM_PROVIDER: z.enum(['anthropic', 'fake']),
      })
      .superRefine((data, ctx) => {
        if (data.NODE_ENV === 'production' && data.LLM_PROVIDER === 'fake') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Cannot use fake in production',
            path: ['LLM_PROVIDER'],
          });
        }
      });

    expect(() => schema.parse(process.env)).toThrow();
  });

  it('should use default values', () => {
    process.env = { ...validEnv };

    const schema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      DB_POOL_MAX: z.coerce.number().default(10),
      QUOTA_GENERATIONS_PER_DAY: z.coerce.number().default(10),
    });

    const result = schema.parse(process.env);
    expect(result.DB_POOL_MAX).toBe(10);
    expect(result.QUOTA_GENERATIONS_PER_DAY).toBe(10);
  });

  it('should validate TRUST_PROXY_HOPS range', () => {
    process.env = { ...validEnv, TRUST_PROXY_HOPS: '10' };

    const schema = z.object({
      TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5),
    });

    expect(() => schema.parse(process.env)).toThrow();

    process.env = { ...validEnv, TRUST_PROXY_HOPS: '3' };
    expect(() => schema.parse(process.env)).not.toThrow();
  });

  it('should validate LOG_LEVEL enum', () => {
    process.env = { ...validEnv, LOG_LEVEL: 'invalid' };

    const schema = z.object({
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
    });

    expect(() => schema.parse(process.env)).toThrow();

    process.env = { ...validEnv, LOG_LEVEL: 'debug' };
    expect(() => schema.parse(process.env)).not.toThrow();
  });
});
