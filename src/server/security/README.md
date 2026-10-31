# Security Testing & Protection

This directory contains security-related code and tests for EventCraft.

## Files

### IDOR Protection

- **`IDOR_PROTECTION_GUIDE.md`** - Comprehensive guide for implementing IDOR protection across all API routes
- **`idor.integration.test.ts`** - High-level IDOR test suite covering all API endpoints (placeholders for HTTP testing)
- **`../db/repositories/idor-protection.integration.test.ts`** - Repository-level IDOR tests (functional, tests actual data isolation)

### Testing Utilities

- **`../testing/test-helpers.ts`** - Helper functions for creating test users, events, and resources

## Running IDOR Tests

```bash
# Run repository-level IDOR tests
pnpm test:integration

# Run all security tests
pnpm test security
```

## IDOR Protection Status

✅ **Repository Level** - Tests verify data isolation at database query level
⚠️ **API Level** - Placeholder tests require HTTP client setup
📋 **Implementation Checklist** - See IDOR_PROTECTION_GUIDE.md for route-by-route checklist

## Security Checklist

- [ ] All routes with `:eventId` verify `event.ownerId === userId`
- [ ] Repository methods properly scope queries by event/owner
- [ ] IDOR test suite passes with 100% success rate
- [ ] Manual penetration testing with two accounts completed
- [ ] No timing attacks reveal resource existence
- [ ] SQL injection attempts handled gracefully
- [ ] Rate limiting prevents brute-force enumeration

## Release Gate SC-03

**Zero cross-tenant access in the IDOR suite**

Before release, all IDOR tests must pass. Any test failure indicates a potential security vulnerability that must be addressed.

## Next Steps

1. Implement HTTP test client for API-level IDOR tests
2. Set up Better Auth session management in tests
3. Run full IDOR suite against staging environment
4. Conduct manual penetration testing
5. Security audit of all ownership checks
