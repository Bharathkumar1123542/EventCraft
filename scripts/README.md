# Scripts

Utility scripts for development, testing, and deployment.

## Performance Gates

### check-bundle-size.ts

Verifies that initial JavaScript bundle sizes meet NFR-14 requirements (≤ 170 KB gzip for authenticated pages).

**Usage:**
```bash
pnpm build
pnpm check:bundle
```

**How it works:**
1. Reads Next.js build manifests (`.next/build-manifest.json` and `.next/app-build-manifest.json`)
2. Calculates gzipped size for all authenticated page chunks
3. Fails build if any authenticated page exceeds 170 KB gzipped
4. Reports all page sizes for transparency

**What it checks:**
- `/events` (Events list)
- `/events/new` (Create event form)
- `/events/[eventId]` (Event overview)
- `/events/[eventId]/budget` (Budget page)
- `/events/[eventId]/timeline` (Timeline page)
- `/events/[eventId]/vendors` (Vendors page)
- `/events/[eventId]/ideas` (Ideas page)
- `/events/[eventId]/assistant` (Assistant page)
- `/events/[eventId]/settings` (Settings page)
- `/account` (Account page)

**Bundle optimization tips:**
- Use `next/dynamic` for large components
- Lazy-load libraries only where needed
- Check for duplicate dependencies with `pnpm why`
- Review bundle analyzer output: `pnpm build --analyze`
- Consider code splitting for rarely-used features

---

### perf-smoke.ts

Performance smoke tests with 20 concurrent connections to validate NFR-01 latency requirements.

**Usage:**
```bash
# Start server first
pnpm build && pnpm start
# Or in dev mode
pnpm dev

# In another terminal, run tests
LLM_PROVIDER=fake pnpm test:perf
```

**Requirements:**
- Server must be running (`pnpm dev` or `pnpm start`)
- `LLM_PROVIDER=fake` to avoid real AI calls
- PostgreSQL must be accessible

**What it tests:**
- **Read operations:** p95 ≤ 200 ms (GET /api/health)
- **Write operations:** p95 ≤ 300 ms (GET /api/ready with DB query)
- **Memory usage:** ≤ 512 MB RSS with 20 concurrent connections

**Test parameters:**
- Connections: 20 concurrent
- Duration: 10 seconds per test
- Uses `autocannon` for load generation

**Interpreting results:**
- ✅ **PASS:** All thresholds met
- ❌ **FAIL:** One or more thresholds exceeded

**Troubleshooting slow tests:**
1. Ensure `LLM_PROVIDER=fake` (real AI calls are slow)
2. Check database connection pool size
3. Profile slow endpoints with Chrome DevTools
4. Review N+1 query issues in database logs
5. Check server resources (CPU/memory)

---

## Database

### migrate.ts

Runs database migrations using Drizzle ORM.

**Usage:**
```bash
pnpm db:migrate
```

**Environment:**
Requires `DATABASE_URL` environment variable.

---

## Testing

### live-test.ts

Runs 30 real AI generations against production Anthropic API to validate generation quality (Release Gate SC-04: ≥29/30 must validate).

**Usage:**
```bash
# Requires real Anthropic API key
ANTHROPIC_API_KEY=your-key pnpm test:live
```

**What it does:**
1. Creates 30 test events with varied parameters
2. Generates full plans (budget + timeline + vendors + ideas)
3. Validates each section against expected schema
4. Reports success rate (must be ≥ 96.7% = 29/30)

**⚠️ Warning:** This uses real API calls and costs money. Only run before release.

---

## Verification

### verify-phase0.ts

Verifies Phase 0 foundation setup:
- Node.js version ≥ 24
- pnpm version ≥ 10
- TypeScript strict mode enabled
- Database connection working
- Environment variables valid

**Usage:**
```bash
tsx scripts/verify-phase0.ts
```

---

## CI Integration

These scripts are integrated into the CI pipeline (`.github/workflows/ci.yml`):

1. **Build job:**
   - Runs `check-bundle-size.ts` after `pnpm build`
   - Fails if bundles exceed 170 KB

2. **Performance job:**
   - Starts server with fake LLM provider
   - Runs `perf-smoke.ts` with 20 connections
   - Fails if p95 latency exceeds thresholds

3. **E2E job:**
   - Runs Playwright tests for J1-J4 journeys
   - Includes accessibility checks with axe-core

All jobs must pass to merge (Release Gate SC-05).

---

## Development Workflow

**Before committing:**
```bash
pnpm check:all  # Lint, typecheck, unit tests, integration tests
```

**Before deploying:**
```bash
pnpm build           # Build production bundle
pnpm check:bundle    # Verify bundle sizes
pnpm test:e2e        # Run E2E tests
pnpm test:perf       # Run performance tests
```

**Before release:**
```bash
pnpm test:live       # Validate with real AI (costs money!)
```

---

## Performance Thresholds Reference

| Metric | Threshold | Spec |
|--------|-----------|------|
| Bundle size (authenticated pages) | ≤ 170 KB gzip | NFR-14, spec.md §13 |
| Read latency (p95) | ≤ 200 ms | NFR-01, spec.md §13 |
| Write latency (p95) | ≤ 300 ms | NFR-01, spec.md §13 |
| Memory (20 concurrent streams) | ≤ 512 MB RSS | NFR-14, spec.md §13 |
| First section generation (p95) | ≤ 8 s | NFR-02, prd.md §6.2 |
| Full plan generation (p95) | ≤ 30 s | NFR-02, prd.md §6.2 |
| Live test success rate | ≥ 96.7% (29/30) | SC-04, spec.md §14 |

---

## Adding New Performance Checks

To add a new performance check:

1. **Bundle size check:**
   - Add page path to `isAuthenticatedPage()` in `check-bundle-size.ts`

2. **Latency check:**
   - Add new endpoint test in `runPerformanceTests()` in `perf-smoke.ts`
   - Define threshold constant at top of file
   - Add result to `results` array

3. **CI integration:**
   - Performance checks run automatically in CI
   - No changes needed unless adding new workflow job
