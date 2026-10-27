# EventCraft — Scope

| Field | Value |
|---|---|
| Document | `scope.md` |
| Version | 1.0.0 |
| Status | Ready for implementation |
| Last updated | 2026-10-22 |
| Source | `architecture.md` v1.0.0, §1 and §2 |
| Companion documents | `prd.md` (what it does, how it looks and feels), `spec.md` (how it is built), `checklist.md` (build order) |

**Normative language.** MUST and MUST NOT mark rules with no exceptions. MAY marks an explicitly optional behavior. Every other sentence is descriptive.

---

## 1. What it is

EventCraft is a web application that turns a short description of an event into a complete, editable plan, then helps the owner track it.

**One-line pitch:** *Describe your event in eight fields; get a budget, a dated timeline, a vendor checklist, and ideas in under a minute, then plan with an assistant that knows your plan.*

The product has two halves with a hard boundary between them:

| Half | Owns | Never does |
|---|---|---|
| Generative (language model) | Proposed budget percentages, task wording and ideal timing, vendor needs and questions, ideas, assistant answers | Arithmetic on money or dates; writing to the database; producing real vendor names, phone numbers, URLs, or live prices |
| Deterministic (code) | Money totals, date scheduling, validation, ownership, persistence, quotas | Creative wording |

## 2. Who it is for

| ID | Persona | Situation | What they need from the first session |
|---|---|---|---|
| J1 | Couple or family member planning a wedding | 6–12 months out, many categories, large budget | A budget they can lock category by category and a timeline that tells them what to do next |
| J2 | Parent planning a child's birthday | 1–3 months out, dietary and age constraints | Ideas they can like or dislike until the list fits, and a timeline in their calendar |
| J3 | Community volunteer chair | Small budget, permits and insurance, volunteers | A vendor checklist with the right questions and a status pipeline |
| J4 | Any user, mid-planning | Overwhelmed, wants the next step | A direct answer to "what should I do this week?" grounded in their own tasks and budget |

**Not for:** professional planners managing many clients, vendors looking for leads, guests looking for an event.

## 3. Problems it solves

1. Planning starts from a blank page and a vague total; users do not know how to split money across categories.
2. Lead-time mistakes: users learn too late which tasks have a long lead time. EventCraft compresses impossible schedules and flags them.
3. Vendor conversations go badly when users do not know what to ask. Every vendor item carries questions to ask.

## 4. What ships (in scope)

| # | Capability | Requirement IDs | Boundary |
|---|---|---|---|
| 1 | Three event types with distinct templates | FR-01, FR-17 | `wedding`, `birthday`, `community` only |
| 2 | Accounts | FR-15, FR-16 | Email and password; Google sign-in when both Google variables are set; account deletion erases all data |
| 3 | Event CRUD | FR-01, FR-02 | One owner per event |
| 4 | AI plan generation with progressive results | FR-03 | Four sections: `budget`, `timeline`, `vendors`, `ideas`; each regenerable alone |
| 5 | Budget with locking and rebalancing | FR-04, FR-05, FR-06 | `sum(allocatedMinor) === totalBudgetMinor` at all times |
| 6 | Expense tracking | FR-06, FR-10 | Statuses `estimated` and `paid`; optional vendor link |
| 7 | Dated timeline with compression flags | FR-07, FR-08 | Manual add, edit, complete, delete |
| 8 | Vendor checklist | FR-09 | Status pipeline `not_started` → `contacted` → `quoted` → `booked` (or `declined`) |
| 9 | Personalized ideas with feedback loop | FR-11, FR-12 | Like, dislike, save; regeneration respects feedback |
| 10 | Read-only grounded assistant | FR-13 | Streams answers; cannot modify data |
| 11 | Export | FR-14 | Markdown plan and ICS timeline |

## 5. What is cut

Everything below MUST NOT be built in version 1.0.0.

| Cut item | Reason | Revisit when |
|---|---|---|
| Booking, payments, contracts, vendor marketplace or directory | Needs real vendor data and legal/payment compliance; not required by the problem statement | A vendor data partner is signed |
| Model-produced vendor names, phones, URLs, live prices | The model would invent them; wrong contact data harms users | A verified vendor source exists |
| Multi-user collaboration, sharing links, roles | Doubles the authorization surface; ownership is a single `ownerId` check today | More than 30% of interviewed users ask for co-planners |
| Guest list, RSVP, seating, invitation delivery | Separate product area | After version 1.0.0 ships and J1 users request it |
| Email, SMS, push notifications and reminders | No messaging infrastructure | A queue and a mail provider are approved |
| Email verification and email-based password reset | Depends on outbound email; consequence: a user who forgets a password must use Google sign-in or create a new account | Same trigger as notifications |
| Native mobile apps | Responsive web covers mobile from 320 px | Mobile sessions exceed 60% of traffic |
| UI languages other than English | Copy and prompts are English-only | A target market is chosen |
| Dark mode | One verified color palette meets AA; a second doubles review effort | After accessibility audit passes in light mode |
| Analytics and telemetry | Privacy commitment (NFR-10); structured logs are the only measurement | A privacy review approves an event schema |
| File or image uploads | No object storage | Moodboards become a requirement |
| Assistant that edits the plan | Prompt injection can change data (D6) | A confirm-before-apply flow is specified |
| A fourth event type | Template catalogue is fixed at three | Add a template entry; no other code change (D4) |
| Admin console | Operators use SQL and logs | More than one operator exists |
| Offline mode or PWA | Needs conflict resolution | Not planned |

## 6. Hard constraints

| Area | Constraint |
|---|---|
| Architecture | Modular monolith: one Next.js 16 app, one PostgreSQL 16 database, one external LLM API (Anthropic) |
| Money | Integer minor units only; no floating-point money anywhere |
| LLM | Untrusted component: fenced inputs, schema-validated outputs, no tools, no write access |
| Privacy | Email, display name, event title, vendor name, vendor contact, expense titles, and free-text notes are never sent to the LLM |
| Cost | One full generation: at most 8,000 input tokens and 9,216 output tokens; daily per-user quotas |
| Quality gates | TypeScript `strict`, no `any`, files ≤ 300 lines, cyclomatic complexity ≤ 10 |
| Portability | `docker compose up` works with only `ANTHROPIC_API_KEY` and `BETTER_AUTH_SECRET` set |

## 7. Success criteria

| ID | Criterion | Gate |
|---|---|---|
| SC-01 | New user reaches a complete plan within 3 minutes of sign-up | E2E with fake LLM; live smoke run |
| SC-02 | 100% of budgets satisfy `sum(allocatedMinor) === totalBudgetMinor` | 10,000-case property test |
| SC-03 | Zero cross-tenant access | IDOR suite covers every endpoint |
| SC-04 | At least 29 of 30 live generations pass validation after at most one repair retry | `pnpm test:live`, pre-release |
| SC-05 | CI green: lint, typecheck, unit, integration, build, E2E, audit, secret scan | GitHub Actions |
| SC-06 | Lighthouse accessibility ≥ 95; axe zero serious or critical | CI E2E job |
| SC-07 | Every section of `architecture.md` maps to a merged artifact | Phase exit checklists in `checklist.md` |

## 8. Where the effort goes (judging weights)

| Criterion | Weight | Decision it drives |
|---|---|---|
| Code quality | High | Pure `domain/` core; lint-enforced layering; one Zod schema per contract |
| Problem statement alignment | High | Each phrase of the problem statement owns one module and one API resource |
| Security | Medium | Ownership in the data layer; Origin check; CSP nonce; LLM treated as untrusted |
| Efficiency | Medium | Parallel section generation; SSE; token caps; Postgres only |
| Testing | Low | Ports and a fake LLM; coverage gates; no mutation testing or contract-testing framework |
| Accessibility | Low | Radix primitives plus automated axe and lint checks; no bespoke widgets |

When two goals conflict, the higher-weighted criterion wins.

## 9. Assumptions in force

| ID | Assumption |
|---|---|
| A-01 | `architecture.md` sections 3–14 were not present in the supplied file. `spec.md` defines their content as derived decisions (`DD-01` to `DD-22`); any later-supplied text for those sections replaces the matching `DD` entry. |
| A-02 | First-release load is 1,000 registered users and 100 daily active users (architecture assumption A-07). |
| A-03 | One application instance runs in the first release; the design stays stateless so more can be added. |
| A-04 | Users plan events at most 3 years ahead. |
| A-05 | Supported currencies: USD, EUR, GBP, INR, CAD, AUD, JPY. |
| A-06 | The Anthropic API is reachable from the deployment; no on-premise model. |

## 10. Scope change rule

1. A new capability enters scope only by moving an equal-effort item out of scope, or by raising the time budget in writing.
2. Every change bumps the version of this document and of `prd.md`, and adds or edits the matching `FR-` row.
3. A cut item (§5) MUST NOT be built "temporarily" or behind a flag.
