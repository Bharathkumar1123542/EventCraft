/**
 * PATCH /api/events/:eventId/vendors/:vendorId - Update vendor
 * DELETE /api/events/:eventId/vendors/:vendorId - Delete vendor
 * Spec: spec.md §8.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { VendorsRepository } from '@/server/db/repositories';
import { updateVendorSchema } from '@/server/schemas/vendors.schema';
import { parseBody, requireJsonContentType, checkBodySize } from '@/server/http/validation';
import { unauthorized, notFound, badRequest } from '@/server/http/problem';
import { sanitizeTitle, sanitizeText, sanitizeStringArray } from '@/server/security/sanitizer';
import { logRequest, logError } from '@/server/http/logger';

const MAX_BODY_SIZE = 20_000; // 20KB

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const start = Date.now();
  const { eventId, vendorId } = await params;

  try {
    const userId = await requireAuth();

    if (!requireJsonContentType(request)) {
      return badRequest('Content-Type must be application/json');
    }

    if (!checkBodySize(request, MAX_BODY_SIZE)) {
      return badRequest(`Request body too large (max ${MAX_BODY_SIZE} bytes)`);
    }

    const result = await parseBody(request, updateVendorSchema);
    
    if (!result.success) {
      return result.error;
    }

    const input = result.data;

    // Sanitize
    const sanitized: typeof input = {};
    
    if (input.need !== undefined) {
      sanitized.need = sanitizeTitle(input.need, 200);
    }
    if (input.questions !== undefined) {
      sanitized.questions = sanitizeStringArray(input.questions, 20, 500);
    }
    if (input.notes !== undefined) {
      sanitized.notes = sanitizeText(input.notes, 1000);
    }
    if (input.status !== undefined) {
      sanitized.status = input.status;
    }
    if (input.isMustHave !== undefined) {
      sanitized.isMustHave = input.isMustHave;
    }

    const repo = new VendorsRepository(db);
    const vendor = await repo.update(vendorId, userId, sanitized);

    if (!vendor) {
      const duration = Date.now() - start;
      logRequest('PATCH', `/api/events/${eventId}/vendors/${vendorId}`, 404, duration, userId);
      return notFound('Vendor not found');
    }

    const duration = Date.now() - start;
    logRequest('PATCH', `/api/events/${eventId}/vendors/${vendorId}`, 200, duration, userId);

    return NextResponse.json(vendor);
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('PATCH', `/api/events/${eventId}/vendors/${vendorId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to update vendor', error as Error, { eventId, vendorId });
    logRequest('PATCH', `/api/events/${eventId}/vendors/${vendorId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; vendorId: string }> }
) {
  const start = Date.now();
  const { eventId, vendorId } = await params;

  try {
    const userId = await requireAuth();

    const repo = new VendorsRepository(db);
    const deleted = await repo.delete(vendorId, userId);

    if (!deleted) {
      const duration = Date.now() - start;
      logRequest('DELETE', `/api/events/${eventId}/vendors/${vendorId}`, 404, duration, userId);
      return notFound('Vendor not found');
    }

    const duration = Date.now() - start;
    logRequest('DELETE', `/api/events/${eventId}/vendors/${vendorId}`, 204, duration, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const duration = Date.now() - start;
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      logRequest('DELETE', `/api/events/${eventId}/vendors/${vendorId}`, 401, duration);
      return unauthorized();
    }

    logError('Failed to delete vendor', error as Error, { eventId, vendorId });
    logRequest('DELETE', `/api/events/${eventId}/vendors/${vendorId}`, 500, duration);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
