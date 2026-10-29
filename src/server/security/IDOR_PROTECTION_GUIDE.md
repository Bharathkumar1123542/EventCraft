# IDOR Protection Implementation Guide

**Goal:** Zero cross-tenant access (Release gate SC-03)

## What is IDOR?

Insecure Direct Object Reference (IDOR) occurs when an application exposes internal object identifiers (like database IDs) and fails to verify the user has permission to access that object.

**Example vulnerability:**
```typescript
// ❌ VULNERABLE CODE
export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  const userId = await requireAuth();
  const event = await db.query.events.findFirst({
    where: eq(events.id, params.eventId), // No ownership check!
  });
  return NextResponse.json({ event });
}
```

User A can access User B's event by simply guessing the event ID!

## Required Protection Pattern

Every API route that accesses event-scoped resources MUST verify ownership:

```typescript
// ✅ SECURE CODE
export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  const userId = await requireAuth();
  
  // Verify ownership BEFORE accessing any data
  const event = await db.query.events.findFirst({
    where: and(
      eq(events.id, params.eventId),
      eq(events.ownerId, userId) // Ownership check!
    ),
  });
  
  if (!event) {
    return notFound(); // or forbidden()
  }
  
  return NextResponse.json({ event });
}
```

## Implementation Checklist

### 1. Events Routes

- [ ] `GET /api/events/:eventId` - Verify `event.ownerId === userId`
- [ ] `PATCH /api/events/:eventId` - Verify ownership before update
- [ ] `DELETE /api/events/:eventId` - Verify ownership before delete
- [ ] `GET /api/events` - Only return events where `ownerId === userId`

### 2. Budget Routes

- [ ] `GET /api/events/:eventId/budget/categories` - Verify event ownership first
- [ ] `PATCH /api/events/:eventId/budget/categories/:key` - Verify event ownership
- [ ] `GET /api/events/:eventId/budget/rollup` - Verify event ownership

### 3. Expenses Routes

- [ ] `GET /api/events/:eventId/expenses` - Verify event ownership
- [ ] `POST /api/events/:eventId/expenses` - Verify event ownership
- [ ] `PATCH /api/events/:eventId/expenses/:expenseId` - Verify event AND expense ownership
- [ ] `DELETE /api/events/:eventId/expenses/:expenseId` - Verify event AND expense ownership

### 4. Tasks Routes

- [ ] `GET /api/events/:eventId/tasks` - Verify event ownership
- [ ] `POST /api/events/:eventId/tasks` - Verify event ownership
- [ ] `PATCH /api/events/:eventId/tasks/:taskId` - Verify event ownership
- [ ] `DELETE /api/events/:eventId/tasks/:taskId` - Verify event ownership

### 5. Vendors Routes

- [ ] `GET /api/events/:eventId/vendors` - Verify event ownership
- [ ] `PATCH /api/events/:eventId/vendors/:vendorId` - Verify event ownership

### 6. Ideas Routes

- [ ] `GET /api/events/:eventId/ideas` - Verify event ownership
- [ ] `PATCH /api/events/:eventId/ideas/:ideaId` - Verify event ownership

### 7. Export Routes

- [ ] `GET /api/events/:eventId/export/markdown` - Verify event ownership
- [ ] `GET /api/events/:eventId/export/ics` - Verify event ownership

### 8. Generation Routes

- [ ] `POST /api/events/:eventId/generate/budget` - Verify event ownership
- [ ] `POST /api/events/:eventId/generate/tasks` - Verify event ownership
- [ ] `POST /api/events/:eventId/generate/vendors` - Verify event ownership
- [ ] `POST /api/events/:eventId/generate/ideas` - Verify event ownership

### 9. Assistant Routes

- [ ] `GET /api/events/:eventId/assistant/conversation` - Verify event ownership
- [ ] `POST /api/events/:eventId/assistant/ask` - Verify event ownership
- [ ] `DELETE /api/events/:eventId/assistant/conversation` - Verify event ownership

## Recommended Helper Function

Create a reusable helper to verify event ownership:

```typescript
// src/server/db/repositories/events.ts
export class EventsRepository {
  async findByIdAndOwner(eventId: string, ownerId: string) {
    return await this.db.query.events.findFirst({
      where: and(
        eq(events.id, eventId),
        eq(events.ownerId, ownerId)
      ),
    });
  }
}

// Usage in API routes
export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const repo = new EventsRepository(db);
  
  const event = await repo.findByIdAndOwner(params.eventId, userId);
  if (!event) {
    return notFound();
  }
  
  // Safe to proceed - ownership verified
  // ...
}
```

## Testing Strategy

### Unit Tests
Test repository methods return only owned data:
```typescript
it('should only return events owned by user', async () => {
  const repo = new EventsRepository(db);
  const events = await repo.listByOwner(userA.id);
  expect(events.every(e => e.ownerId === userA.id)).toBe(true);
});
```

### Integration Tests
Test API routes block unauthorized access:
```typescript
it('should return 403 when User B accesses User A event', async () => {
  const response = await request(app)
    .get(`/api/events/${eventA.id}`)
    .set('Authorization', `Bearer ${userB.token}`);
  
  expect(response.status).toBe(403);
  expect(response.body).not.toHaveProperty('event');
});
```

### Manual Testing
1. Create two test accounts (User A, User B)
2. Create event as User A
3. Copy event ID from URL
4. Sign in as User B
5. Manually change URL to User A's event ID
6. Verify: Should see 403 Forbidden or 404 Not Found, never User A's data

## Common Pitfalls

### ❌ Trusting Client Input
```typescript
// NEVER trust eventId from client without ownership check
const { eventId } = await request.json();
const tasks = await tasksRepo.listByEvent(eventId); // VULNERABLE!
```

### ❌ Checking Only Parent Resource
```typescript
// Checking event ownership but not child resource
const event = await verifyOwnership(eventId, userId);
const expense = await db.query.expenses.findFirst({
  where: eq(expenses.id, expenseId), // Missing event check!
});
```

### ❌ Inconsistent Error Responses
```typescript
// Don't reveal whether resource exists
if (!event) return new Response('Event not found', { status: 404 });
if (event.ownerId !== userId) return new Response('Forbidden', { status: 403 });

// Better: Always return same response
if (!event || event.ownerId !== userId) return notFound();
```

### ❌ Forgetting Query Parameters
```typescript
// Filter parameter could leak data
GET /api/events/:eventId/tasks?status=done

// Must verify event ownership before applying filters
const event = await verifyOwnership(eventId, userId);
const tasks = await tasksRepo.listByEvent(eventId, { status }); // Safe
```

## Response Codes

- **401 Unauthorized** - User not authenticated (no session)
- **403 Forbidden** - User authenticated but not authorized (reveal resource exists)
- **404 Not Found** - Preferred for IDOR (don't reveal resource existence)

**Recommendation:** Use **404 Not Found** for IDOR protection to prevent resource enumeration.

## Audit Process

1. List all API routes with `:eventId` parameter
2. For each route, verify ownership check exists
3. Run IDOR test suite and verify all tests pass
4. Manual penetration testing with two accounts
5. Code review focusing on ownership checks

## Release Gate

**SC-03:** Zero cross-tenant access in the IDOR suite

All IDOR tests must pass before release. Any failure indicates a security vulnerability that MUST be fixed.
