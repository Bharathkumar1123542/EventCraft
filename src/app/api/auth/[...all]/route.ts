/**
 * Better Auth API routes
 * Spec: spec.md §6.1
 */

import { auth } from '@/server/auth/config';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
