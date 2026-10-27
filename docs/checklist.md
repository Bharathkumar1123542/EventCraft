# EventCraft — Build Checklist

| Field | Value |
|---|---|
| Document | `checklist.md` |
| Version | 1.0.0 |
| Last updated | 2026-10-22 |
| Source of detail | `spec.md` §14 (step IDs `S01`–`S45` match exactly) |

**How to use.** Work top to bottom. Tick a box only when the step's **Done when** condition in `spec.md` §14 is met and CI is green. Do not start a phase until the previous phase is fully ticked. Scope questions are answered by `scope.md`; behavior questions by `prd.md`.

## Phase 0 — Foundation

- [ ] **S01** Scaffold Next.js 16 + TypeScript strict + Tailwind 4 + pnpm, Node 24
- [ ] **S02** ESLint (layer boundaries, no `any`, 300-line and complexity-10 limits, a11y) + Prettier
- [ ] **S03** Environment parsing with fail-fast validation
- [ ] **S04** Vitest, `fast-check`, coverage gates
- [ ] **S05** GitHub Actions pipeline
- [ ] **S06** Dockerfile and `compose.yaml` (`/api/health` returns 200)

## Phase 1 — Domain (pure code)

- [ ] **S07** Money: `toMinor`, `formatMoney`, `allocateByWeights`
- [ ] **S08** Dates and `Clock`
- [ ] **S09** Template catalogue (wedding, birthday, community)
- [ ] **S10** Budget: initial allocation and AI weights (10,000-case property tests)
- [ ] **S11** Budget: edit, lock, set total, summarize
- [ ] **S12** Timeline scheduler with compression
- [ ] **S13** ICS, Markdown export, assistant snapshot

## Phase 2 — Persistence, auth, HTTP

- [ ] **S14** Drizzle schema and migration `0001`
- [ ] **S15** Migration `0002`: budget-sum trigger, checks, indexes
- [ ] **S16** Owner-scoped repositories
- [ ] **S17** Better Auth (email/password, optional Google)
- [ ] **S18** `proxy.ts`: CSP nonce, headers, Origin check, page gate
- [ ] **S19** `lib/http`: routes, problem responses, logging, size limits
- [ ] **S20** Rate limiter, daily quotas, sanitizer
- [ ] **S21** Events API, `/me`, health and ready

## Phase 3 — Plan resources (non-AI)

- [ ] **S22** Budget and expenses API
- [ ] **S23** Tasks API
- [ ] **S24** Vendors API
- [ ] **S25** Ideas feedback API
- [ ] **S26** Export API (Markdown, ICS)

## Phase 4 — AI

- [ ] **S27** `LlmClient` port, fake client, output schemas
- [ ] **S28** Prompt builders and input fencing
- [ ] **S29** Anthropic adapter (repair retry, deadlines, error mapping)
- [ ] **S30** Section generators with domain post-processing
- [ ] **S31** Generation service and SSE route
- [ ] **S32** Read-only assistant service and SSE route

## Phase 5 — UI

- [ ] **S33** Design tokens, base components, app shell
- [ ] **S34** Sign-in, sign-up, account
- [ ] **S35** Event list, create form, settings
- [ ] **S36** SSE client, generation provider, overview
- [ ] **S37** Budget page
- [ ] **S38** Timeline page
- [ ] **S39** Vendors page
- [ ] **S40** Ideas page
- [ ] **S41** Assistant page

## Phase 6 — Hardening and release

- [ ] **S42** IDOR suite over every route
- [ ] **S43** Playwright journeys J1–J4, failure injection, axe
- [ ] **S44** Bundle-size and latency gates in CI
- [ ] **S45** Live test (30 generations) and README

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
