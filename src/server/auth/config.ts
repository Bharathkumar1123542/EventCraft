import 'server-only';
/**
 * Better Auth configuration
 * Spec: spec.md §6.1
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import { env } from '../config/env';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Per spec.md §6.1: no email verification in MVP
  },
  socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: [env.APP_URL],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  advanced: {
    cookiePrefix: 'eventcraft',
    useSecureCookies: env.NODE_ENV === 'production',
  },
});

export type Session = typeof auth.$Infer.Session;
