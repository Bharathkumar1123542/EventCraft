import 'server-only';
import { z } from 'zod';

const envSchema = z
  .object({
    // Application
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.string().url().default('http://localhost:3000'),

    // Database
    DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(10),

    // Authentication
    BETTER_AUTH_SECRET: z.string().min(32),

    // LLM
    LLM_PROVIDER: z.enum(['anthropic', 'fake']).default('anthropic'),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    LLM_MODEL_PRIMARY: z.string().min(1).default('claude-sonnet-5-5'),
    LLM_MODEL_FAST: z.string().min(1).default('claude-haiku-5-5'),

    // Google OAuth (both or neither)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Networking
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

    // Quotas
    QUOTA_GENERATIONS_PER_DAY: z.coerce.number().int().min(1).max(1000).default(10),
    QUOTA_ASSISTANT_MESSAGES_PER_DAY: z.coerce.number().int().min(1).max(5000).default(50),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Testing (fake LLM provider)
    FAKE_LLM_FAIL_SECTIONS: z.string().default(''),
    FAKE_LLM_DELAY_MS: z.coerce.number().int().min(0).default(0),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Google OAuth: both or neither
    const hasClientId = !!data.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!data.GOOGLE_CLIENT_SECRET;
    if (hasClientId !== hasClientSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set, or neither',
        path: hasClientId ? ['GOOGLE_CLIENT_SECRET'] : ['GOOGLE_CLIENT_ID'],
      });
    }

    // Anthropic API key required when provider is anthropic
    if (data.LLM_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER is "anthropic"',
        path: ['ANTHROPIC_API_KEY'],
      });
    }

    // Fake provider not allowed in production
    if (data.NODE_ENV === 'production' && data.LLM_PROVIDER === 'fake') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LLM_PROVIDER cannot be "fake" in production',
        path: ['LLM_PROVIDER'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`);
    console.error('❌ Invalid environment variables:\n' + errors.join('\n'));
    process.exit(1);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

// Initialize on module load (fail-fast)
if (typeof window === 'undefined') {
  getEnv();
}
