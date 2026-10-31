/**
 * GET /api/me - Current user info
 * Spec: spec.md §8.1
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { unauthorized } from '@/server/http/problem';

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return unauthorized();
  }

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
}
