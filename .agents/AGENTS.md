# AGENTS.md — EventCraft

Instructions for any AI agent or engineer. Read this file fully before writing code.

**Project:** EventCraft turns a short event description (wedding, birthday, community) into a budget, dated timeline, vendor checklist, and ideas, then tracks the plan with a read-only assistant. One Next.js 16 app, PostgreSQL 16, Anthropic API. **The LLM proposes; deterministic code guarantees money and dates.**

## Read first, in this order

1. `scope.md` — what is in, what is cut
2. `prd.md` — behavior, screens, copy, look and feel
3. `spec.md` — how it is built; §14 lists the steps
4. `checklist.md` — build order; tick boxes as you go

If documents conflict, `architecture.md` §1–2 wins, then `spec.md`. If a document is silent, pick the simplest option that satisfies the rules below and record it as a new `DD-nn` row in `spec.md` §0.

## Workflow

1. Build in checklist order, `S01` → `S45`, one step per change. Do not skip ahead or start a phase before the previous one is ticked.
2. Before a step, read its `spec.md` sections. After it, check its **Done when** line and run `pnpm lint && pnpm typecheck && pnpm test`.
3. Tick the box only when Done-when is met and CI is green.
4. Do not build anything in `scope.md` §5 (cut items), not even behind a flag.
5. Ask the user only when an ambiguity changes the design; otherwise proceed and document the assumption.

## Hard rules

**Money and dates**
- Money is integer minor units (`...Minor`), never floats. Budget invariant: `sum(allocatedMinor) === totalBudgetMinor` after every committed transaction.
- Calendar dates are `YYYY-MM-DD` strings. "Today" comes from the injected `Clock` in the event's time zone. Never call `Date.now()` or `new Date()` in domain code.

**Architecture**
- Layering is lint-enforced (`architecture.md` §2.4). `src/domain` is pure: no I/O, no framework imports.
- Every file under `src/server/` starts with `import "server-only";`.
- Every repository call takes an owner scope. A foreign or missing resource returns `404` with an identical body.
- Validate every boundary with one Zod `.strict()` schema from `src/schemas`. Errors use RFC 9457 `application/problem+json`.

**LLM safety**
- The model is untrusted: no tools, fenced input, schema-validated output, one repair retry, hard `max_tokens` caps.
- Never ask the model for vendor names, phone numbers, URLs, emails, or prices.
- The assistant is read-only; its constructor receives no write methods. Render model output as plain text only.
- Never send to the model: account email or name, event title, vendor name or contact, quotes, expense titles, notes.

**Quality**
- TypeScript `strict`, no `any`, files ≤ 300 lines, cyclomatic complexity ≤ 10.
- Tests never call the real model; use `FakeLlmClient` (`LLM_PROVIDER=fake`). `pnpm test:live` is manual, pre-release only.
- Never log request bodies, email, name, passwords, or notes.

**Naming**
- JSON `camelCase`; DB `snake_case`; enum values `lower_snake_case`; error codes and env vars `UPPER_SNAKE_CASE`; files `kebab-case`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` | Run / build |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `pnpm test` / `pnpm test:integration` / `pnpm test:e2e` | Unit and property / PostgreSQL / Playwright |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply migrations (the app never migrates itself) |
| `docker compose up` | Full stack; needs only `ANTHROPIC_API_KEY` and `BETTER_AUTH_SECRET` |

## Never

- Add dependencies outside `spec.md` §1 without a `DD-nn` entry and a stated reason.
- Hand-edit applied migrations; add a new one.
- Weaken a test, lint rule, or coverage gate to make a step pass.
- Mark a step done with failing checks.
