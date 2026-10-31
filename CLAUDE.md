# CLAUDE.md — EventCraft Quick Reference

Quick-start guide for AI agents or engineers resuming work on EventCraft.

---

## What This Is

EventCraft turns an event description (wedding, birthday, or community event) into a complete plan: budget split across categories, dated timeline, vendor checklist, and personalized ideas. Users then track expenses, tasks, vendors, and ask an AI assistant questions.

**Architecture:** One Next.js 16 app, PostgreSQL 16, Anthropic API. The LLM proposes; deterministic code guarantees money and dates are exact.

---

## Commands

Must have: Node.js 24 (see `.nvmrc`), pnpm 10

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
```

### Database
```bash
# Requires PostgreSQL 16 running (or: docker compose up db)
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply pending migrations
```

### Testing
```bash
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm test             # Unit tests (domain, schemas, utils)
pnpm test:integration # Integration tests (requires PostgreSQL)
pnpm test:e2e         # Playwright E2E tests
pnpm test:live        # Manual only: 30 real LLM generations (pre-release)
```

### Docker
```bash
docker compose up     # Full stack: db + migrate + app
# Requires: ANTHROPIC_API_KEY and BETTER_AUTH_SECRET in environment
```

---

## Environment Variables

Create `.env.local` for development:

```bash
# Required
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/eventcraft
BETTER_AUTH_SECRET=<at least 32 random characters>
ANTHROPIC_API_KEY=<your key>

# Optional
LLM_PROVIDER=anthropic              # or 'fake' for tests
LLM_MODEL_PRIMARY=claude-sonnet-5-5
LLM_MODEL_FAST=claude-haiku-5-5
GOOGLE_CLIENT_ID=                   # Both or neither (OAuth)
GOOGLE_CLIENT_SECRET=
QUOTA_GENERATIONS_PER_DAY=10
QUOTA_ASSISTANT_MESSAGES_PER_DAY=50
DB_POOL_MAX=10
TRUST_PROXY_HOPS=0
LOG_LEVEL=info
```

**For tests:** Use `LLM_PROVIDER=fake`. Never call the real API in automated tests.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages, layouts, routes)
│   ├── (public)/          # Sign-in, sign-up
│   ├── (app)/events/      # Authenticated event pages
│   └── api/               # REST + SSE endpoints
├── components/            # React Client Components
├── lib/
│   ├── http/             # defineRoute, SSE, problem responses
│   └── client/           # API client, hooks, SSE parser
├── domain/               # Pure functions (no I/O, no framework)
│   ├── money.ts          # Integer minor units, allocateByWeights
│   ├── dates.ts          # IsoDate, Clock, day arithmetic
│   ├── templates.ts      # Category catalogues per event type
│   ├── budget.ts         # Allocation, lock, rebalance logic
│   ├── timeline.ts       # Task scheduling with compression
│   └── ics.ts, markdown.ts, snapshot.ts
├── schemas/              # Zod schemas (single source of validation)
└── server/               # All files: import "server-only"
    ├── config/env.ts
    ├── auth/             # Better Auth
    ├── db/
    │   ├── schema/       # Drizzle table definitions
    │   └── repositories/ # Owner-scoped DB access
    ├── security/         # Rate limits, quotas, sanitizer
    ├── ai/
    │   ├── llm-client.ts        # Port interface
    │   ├── anthropic-client.ts  # Real adapter
    │   ├── fake-llm-client.ts   # Test adapter
    │   ├── output-schemas.ts
    │   ├── prompts/
    │   └── generators/
    ├── services/         # Business logic (no SQL, no HTTP)
    └── container.ts      # DI composition root
```

---

## Key Conventions

### Money
- Always integer minor units (field names end in `...Minor`)
- Never floats, never rounding
- Use `toMinor()` to parse, `formatMoney()` to display
- Budget invariant: `sum(allocatedMinor) === totalBudgetMinor` (enforced by DB trigger)

### Dates
- Calendar dates: `IsoDate` type (`YYYY-MM-DD` string)
- "Today" always from injected `Clock` in event's timezone
- Never call `Date.now()` or `new Date()` in domain code

### Naming
- JSON fields: `camelCase`
- DB columns: `snake_case`
- Enum values: `lower_snake_case`
- Error codes: `UPPER_SNAKE_CASE`
- Files: `kebab-case`

### Layering (enforced by ESLint)
- `domain/` → no imports (pure TypeScript)
- `schemas/` → domain, Zod only
- `server/db/` → domain, schemas, Drizzle
- `server/ai/` → domain, schemas, Anthropic SDK
- `server/services/` → everything except app/components
- `app/` pages → server/container (read-only), schemas
- `components/` → lib/client, schemas only (never server/*)

### Testing
- Unit tests colocated: `money.ts` → `money.test.ts`
- Use `FakeLlmClient` for all automated tests
- Property tests for budget allocation (10,000 cases)
- Integration tests need PostgreSQL
- E2E tests use Playwright with fake LLM

---

## Common Tasks

### Add a new API endpoint
1. Define Zod schemas in `src/schemas/`
2. Add repository method in `src/server/db/repositories/` (owner-scoped)
3. Add service method in `src/server/services/` (business logic)
4. Add route in `src/app/api/v1/*/route.ts` using `defineRoute`
5. Register in `src/lib/http/routes-registry.ts` (for IDOR suite)
6. Add to API client in `src/lib/client/`
7. Write integration test with ownership checks

### Add a new domain function
1. Write pure function in `src/domain/` (no I/O)
2. Add colocated unit tests
3. If money or dates: add property tests with `fast-check`
4. Export from `src/domain/index.ts`

### Change database schema
1. Edit Drizzle schema in `src/server/db/schema/`
2. Run `pnpm db:generate` to create SQL migration
3. Review generated SQL, commit it
4. Run `pnpm db:migrate` to apply
5. Update repositories and services
6. Never hand-edit applied migrations (add new one)

### Add a UI component
1. Create in `src/components/` (Client Component with 'use client')
2. Use design tokens from `globals.css` (PRD §5.1)
3. Radix primitives for interactive widgets
4. Test accessibility with Playwright + axe
5. Keep files ≤ 300 lines

---

## Critical Rules

**Never:**
- Build anything in `scope.md` §5 (cut items)
- Send email, name, event title, vendor name, or notes to LLM
- Use floating-point for money
- Call `Date.now()` or `new Date()` in domain code
- Import server code in client components
- Skip ownership checks in repositories
- Merge with failing lint, typecheck, or tests
- Weaken coverage gates to make tests pass

**Always:**
- Start files in `src/server/` with `import "server-only";`
- Validate every boundary with Zod `.strict()` schemas
- Use `BigInt` in `allocateByWeights` (money × weights exceeds Number.MAX_SAFE_INTEGER)
- Fence user input in LLM prompts with `<untrusted_user_text>` tags
- Return 404 with identical body for missing and foreign resources
- Persist each generation section in its own transaction
- Keep assistant read-only (type-level enforcement)

**Before committing:**
```bash
pnpm lint && pnpm typecheck && pnpm test
```

---

## Build Order

Follow `checklist.md` top to bottom. Phases must complete in order:
1. **Phase 0:** Foundation (scaffold, lint, CI, Docker)
2. **Phase 1:** Domain (pure code: money, dates, budget, timeline)
3. **Phase 2:** Persistence, auth, HTTP (DB, repositories, routes)
4. **Phase 3:** Plan resources (budget, tasks, vendors, ideas APIs)
5. **Phase 4:** AI (LLM client, prompts, generators, streaming)
6. **Phase 5:** UI (pages, forms, SSE client)
7. **Phase 6:** Hardening (IDOR suite, E2E, performance gates)

Tick a checklist box only when:
- Step's "Done when" condition met (see `spec.md` §14)
- All tests pass
- CI green

---

## Debugging Tips

**Generation not streaming:**
- Check `LLM_PROVIDER` is set correctly
- Check `ANTHROPIC_API_KEY` if using real API
- Look for `generation_runs` rows with status `running` (stale runs cleared after 2 min)

**Budget not summing to total:**
- Check `allocateByWeights` uses `BigInt` for intermediates
- Check migration 0002 applied (trigger enforces sum)
- Run integration test that tries to violate invariant

**Tests failing with "Cannot find module 'server-only'":**
- Missing `import "server-only";` at top of server file
- Or client code trying to import server module (layering violation)

**Cross-tenant access:**
- Repository missing owner scope in WHERE clause
- Check IDOR suite passes for that route

**Date wrong timezone:**
- Using `Date.now()` instead of `Clock.now()` + `todayIn(clock, timezone)`
- Verify timezone string is valid IANA identifier

---

## Documents

Read in this order when starting:
1. `scope.md` — what's in, what's cut, success criteria
2. `prd.md` — user stories, screens, copy, look and feel
3. `spec.md` — how it's built (all technical detail)
4. `architecture.md` — system design, trade-offs
5. `checklist.md` — build order
6. `plan.md` — implementation plan (this follows from above)

If docs conflict: `architecture.md` §1–2 wins, then `spec.md`.

---

## Getting Help

**Problem:** Not sure which requirement covers a scenario  
**Answer:** Search `spec.md` for error codes, or `prd.md` for user stories

**Problem:** Test is failing after a change  
**Answer:** Read the "Done when" line for that step in `spec.md` §14

**Problem:** Unsure how to implement a feature  
**Answer:** Check if there's a `DD-nn` derived decision in `spec.md` §0, or a similar pattern in domain layer

**Problem:** Coverage gate failing  
**Answer:** Write more tests (don't lower the gate). Coverage thresholds in `spec.md` §12.3

**Problem:** Layering violation  
**Answer:** Check `architecture.md` §2.4 for allowed imports; ESLint will catch it

**Problem:** Deployment failing  
**Answer:** Verify all required env vars set; check `compose.yaml` matches `spec.md` §10

---

## Release Criteria

All of these must pass:
- [ ] SC-01: New user reaches complete plan within 3 minutes (E2E test)
- [ ] SC-02: 100% of budgets satisfy sum invariant (10,000-case property test)
- [ ] SC-03: Zero cross-tenant access (IDOR suite covers all 31 routes)
- [ ] SC-04: ≥29/30 live generations validate (manual `pnpm test:live`)
- [ ] SC-05: CI green (lint, typecheck, unit, integration, build, E2E, audit, secret scan)
- [ ] SC-06: Lighthouse accessibility ≥95, axe zero serious/critical
- [ ] SC-07: Every architecture.md section maps to merged artifact
- [ ] Every Must story in `prd.md` §3 passes acceptance criteria
- [ ] Residual risks in `spec.md` §9.4 reviewed

---

**Version:** 1.0.0  
**Last updated:** 2026-10-27
