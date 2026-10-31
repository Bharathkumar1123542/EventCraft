/**
 * Client-side auth helpers
 * Spec: spec.md §6.1
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export const { useSession, signIn, signUp, signOut } = authClient;
