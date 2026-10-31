// This file intentionally violates the server-only import rule
// It should be deleted after verification

'use client';

// Rule violation: client component importing from server
// Uncomment to test:
// import { getEnv } from '../server/config/env';

export function TestComponent() {
  return <div>Test</div>;
}
