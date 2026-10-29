import 'server-only';
/**
 * Session helpers
 * Spec: spec.md §6.1
 */

import { cookies, headers } from 'next/headers';
import { auth } from './config';
import { cache } from 'react';

/**
 * Get current session (server components and actions)
 * Cached per request
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
});

/**
 * Get current user ID (throws if not authenticated)
 */
export async function requireAuth(): Promise<string> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return session.user.id;
}

/**
 * Get current user ID (returns null if not authenticated)
 */
export async function getOptionalAuth(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Sign out helper
 */
export async function signOut() {
  await auth.api.signOut({
    headers: await headers(),
  });
}
