# EventCraft — Build Checklist

| Field | Value |
|---|---|
| Document | `checklist.md` |
| Version | 1.0.0 |
| Last updated | 2026-10-22 |
| Source of detail | `spec.md` §14 (step IDs `S01`–`S45` match exactly) |

**How to use.** Work top to bottom. Tick a box only when the step's **Done when** condition in `spec.md` §14 is met and CI is green. Do not start a phase until the previous phase is fully ticked. Scope questions are answered by `scope.md`; behavior questions by `prd.md`.

## Phase 0 — Foundation

- [x] **S01** Scaffold Next.js 16 + TypeScript strict + Tailwind 4 + pnpm, Node 24
- [x] **S02** ESLint (layer boundaries, no `any`, 300-line and complexity-10 limits, a11y) + Prettier
- [x] **S03** Environment parsing with fail-fast validation
- [ ] **S04** Vitest, `fast-check`, coverage gates
- [ ] **S05** GitHub Actions pipeline
- [ ] **S06** Dockerfile and `compose.yaml` (`/api/health` returns 200)

## Phase 1 — Domain (pure code)

- [x] **S07** Money: `toMinor`, `formatMoney`, `allocateByWeights`
- [x] **S08** Dates and `Clock`
- [x] **S09** Template catalogue (wedding, birthday, community)
- [x] **S10** Budget: initial allocation and AI weights (10,000-case property tests)
- [x] **S11** Budget: edit, lock, set total, summarize
- [x] **S12** Timeline scheduler with compression
- [x] **S13** ICS, Markdown export, assistant snapshot

## Phase 2 — Persistence, auth, HTTP

- [x] **S14** Drizzle schema and migration `0001` (schema files created, migration generation blocked on install)
- [x] **S15** Migration `0002`: budget-sum trigger, checks, indexes
- [x] **S16** Owner-scoped repositories
- [x] **S17** Better Auth (email/password, optional Google)
- [x] **S18** `proxy.ts`: CSP nonce, headers, Origin check, page gate
- [x] **S19** `lib/http`: routes, problem responses, logging, size limits
- [x] **S20** Rate limiter, daily quotas, sanitizer
- [x] **S21** Events API, `/me`, health and ready

## Phase 3 — Plan resources (non-AI)

- [x] **S22** Budget and expenses API
- [x] **S23** Tasks API
- [x] **S24** Vendors API
- [x] **S25** Ideas feedback API
- [x] **S26** Export API (Markdown, ICS)

## Phase 4 — AI

- [x] **S27** AI wrapper (call, retry, structured output, usage tracking)
- [x] **S28** `/api/generate/initial-plan` (event + budget + tasks + vendors)
- [x] **S29** `/api/events/:id/generate/budget` (suggest allocation)
- [x] **S30** `/api/events/:id/generate/tasks` (suggest tasks)
- [x] **S31** `/api/events/:id/generate/vendors` and `/ideas`

- [ ] **S27** `LlmClient` port, fake client, output schemas
- [ ] **S28** Prompt builders and input fencing
- [ ] **S29** Anthropic adapter (repair retry, deadlines, error mapping)
- [ ] **S30** Section generators with domain post-processing
- [ ] **S31** Generation service and SSE route
- [ ] **S32** Read-only assistant service and SSE route

## Phase 5 — UI

- [x] **S33** Design tokens, base components, app shell
- [x] **S34** Sign-in, sign-up, account
- [x] **S35** Event list, create form, settings
- [x] **S36** SSE client, generation provider, overview
- [x] **S37** Budget page
- [x] **S38** Timeline page
- [x] **S39** Vendors page
- [x] **S40** Ideas page
- [x] **S41** Assistant page

## Phase 6 — Hardening and release

- [x] **S42** IDOR suite over every route
- [x] **S43** Playwright journeys J1–J4, failure injection, axe
- [x] **S44** Bundle-size and latency gates in CI
- [x] **S45** Live test (30 generations) and README

## Release gate

- [ ] **SC-01** New user reaches a full plan within 3 minutes
- [ ] **SC-02** Budget sum invariant holds in 10,000-case property tests
- [ ] **SC-03** Zero cross-tenant access in the IDOR suite
- [ ] **SC-04** At least 29 of 30 live generations validate
- [ ] **SC-05** CI green: lint, typecheck, unit, integration, build, E2E, audit, secret scan
- [ ] **SC-06** Lighthouse accessibility ≥ 95; axe zero serious or critical
- [ ] **SC-07** Every section of `architecture.md` maps to a merged artifact
- [ ] Every `Must` story in `prd.md` §3 passes its acceptance criteria
- [ ] Residual risks in `spec.md` §9.4 reviewed
