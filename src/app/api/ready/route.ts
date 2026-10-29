/**
 * GET /api/ready - Readiness check
 * Spec: spec.md §6.3
 * Checks database connectivity
 */

import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { sql } from 'drizzle-orm';
import { serviceUnavailable } from '@/server/http/problem';

export async function GET() {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serviceUnavailable('Database not ready');
  }
}
