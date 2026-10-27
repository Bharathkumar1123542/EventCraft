# EventCraft — Product Requirements Document

| Field | Value |
|---|---|
| Document | `prd.md` |
| Version | 1.0.0 |
| Status | Ready for implementation |
| Last updated | 2026-10-22 |
| Depends on | `scope.md` (boundaries), `architecture.md` §1–2 (requirement IDs) |
| Consumed by | `spec.md` (implementation), `checklist.md` (build order) |

**Normative language.** MUST and MUST NOT mark rules with no exceptions. MAY marks an explicitly optional behavior. Requirement IDs (`FR-`, `NFR-`, `SC-`) come from `architecture.md`; story IDs (`US-`) are defined here.

**Contents**

1. [Product summary](#1-product-summary)
2. [Journeys](#2-journeys)
3. [Feature requirements](#3-feature-requirements)
4. [Screens and navigation](#4-screens-and-navigation)
5. [Look and feel](#5-look-and-feel)
6. [Content and tone](#6-content-and-tone)
7. [States: empty, loading, error](#7-states-empty-loading-error)
8. [Accessibility](#8-accessibility)
9. [Quality bars](#9-quality-bars)
10. [Release criteria](#10-release-criteria)

---

## 1. Product summary

EventCraft helps one person plan a wedding, birthday, or community event. The person enters eight fields. The system streams back four plan sections. The person then edits the plan, tracks money and tasks, and asks an assistant questions about it.

**Product principles** (each resolves design arguments):

1. **Numbers are exact.** If the screen shows a total, the parts add up to it. Always.
2. **The AI proposes; the person decides.** Every generated item is editable, deletable, and regenerable. Edited items survive regeneration.
3. **Partial success is success.** One failed section never blanks the others.
4. **Quiet confidence.** Plain words, no hype, no emoji, no exclamation marks in errors.
5. **Never invent contacts.** The product shows needs and questions; the user supplies vendor names.

## 2. Journeys

| ID | Persona | Journey | Done when |
|---|---|---|---|
| J1 | Wedding planner (couple or family) | Sign up → create event → watch plan stream in → lock venue budget → log a deposit → tick a task | Venue allocation stays fixed while other categories rebalance; deposit appears as `paid` in the venue row |
| J2 | Parent planning a birthday | Create event with dietary and age preferences → review ideas → like or dislike → regenerate ideas → export timeline | Regenerated ideas exclude disliked titles and keep saved ones; `.ics` imports into a calendar |
| J3 | Community volunteer chair | Create community event with small budget → generate vendor checklist → move items from `not_started` to `booked` | Setting `booked` without a vendor name is blocked with a field error |
| J4 | Mid-planning user | Open assistant → ask "What should I do this week?" | Answer cites open tasks due within 7 days and budget status from the user's data |

## 3. Feature requirements

Priority: **Must** ships in 1.0.0; **Should** ships in 1.0.0 and is first to be dropped if the schedule slips; nothing else is in scope.

### 3.1 Accounts (FR-15, FR-16)

| ID | Story | Acceptance criteria |
|---|---|---|
| US-01 | As a visitor, I create an account with name, email, and password. | Password length 10–128. Success lands on `/events`. A duplicate email shows the field error "An account with this email already exists." |
| US-02 | As a user, I sign in and out. | Wrong email or password shows one generic message: "Email or password is incorrect." Sign-out ends the session and lands on `/sign-in`. |
| US-03 | As a user, I sign in with Google. | The Google button renders only when both Google variables are set on the server. |
| US-04 | As a user, I delete my account. | A dialog requires typing `DELETE`. Confirming deletes all data, signs out, and lands on `/` with the message "Your account and data were deleted." |

### 3.2 Events (FR-01, FR-02, FR-17) — Must

| ID | Story | Acceptance criteria |
|---|---|---|
| US-05 | I create an event with eight visible fields. | Fields: type, title, date, city (optional), guest count, currency, total budget, preferences (optional section). The time zone is auto-detected from the browser, shown as helper text, and editable through a "Change" link. |
| US-06 | I get clear validation. | Invalid input shows per-field messages under each field; focus moves to the first invalid field. A date earlier than today (in the event time zone) is rejected with "Choose today or a later date." |
| US-07 | I see all my events and open one. | List shows title, type, date, days remaining, budget total; sorted by creation time, newest first; 20 per page with "Load more". |
| US-08 | I edit event details. | Title, date, time zone, city, guest count, total budget, and preferences are editable. Type and currency are read-only after creation. A stale edit (another tab saved first) shows "This event changed in another tab. Reload to continue." |
| US-09 | I delete an event. | Dialog names the event and requires one click on "Delete event". All its plan data is removed. |

**Creation behavior.** Submitting creates the event and its budget categories immediately (type defaults, summing exactly to the total), then redirects to the overview and starts generation automatically.

### 3.3 Plan generation (FR-03, FR-12) — Must

| ID | Story | Acceptance criteria |
|---|---|---|
| US-10 | I watch the plan build. | The overview shows four section cards (Budget, Timeline, Vendors, Ideas). Each shows a skeleton, then its content as soon as that section completes. First section within 8 s and all four within 30 s (95th percentile, provider healthy). |
| US-11 | I recover from a failed section. | A failed section shows its own error and a "Try again" button that regenerates only that section. The other sections stay visible. |
| US-12 | I regenerate any section. | A menu on each section offers "Regenerate". Budget regeneration changes only unlocked categories; timeline and vendors regeneration keeps items I edited, completed, or added; ideas regeneration keeps saved and rated ideas. |
| US-13 | I steer regeneration. | An optional instructions box (max 500 characters, live counter) is available for timeline, vendors, and ideas regeneration. |
| US-14 | I know when I hit a limit. | Rate or daily quota errors show the reset time and keep all existing plan data usable. |

### 3.4 Budget (FR-04, FR-05, FR-06) — Must

| ID | Story | Acceptance criteria |
|---|---|---|
| US-15 | I see where my money goes. | A table lists every category with allocated, committed, paid, and remaining amounts, and a status chip. A totals row shows `total allocated` equal to the event total. |
| US-16 | I fix a category amount. | Editing an allocation locks the category (lock icon filled) and rebalances unlocked categories proportionally; the table updates from the server response. If locked amounts exceed the total, the edit is rejected with "Locked amounts can't exceed your total budget." |
| US-17 | I unlock a category. | The lock icon toggles; unlocking changes no amounts. |
| US-18 | I log expenses. | Each expense has title, amount, status (`estimated` or `paid`), optional vendor link, optional note. Category status is `ok`, `near_limit` (committed ≥ 90% of allocation), or `over` (committed > 100%). The chip text states the status; color is never the only signal. |
| US-19 | I change the total budget. | Raising or lowering the total rebalances unlocked categories; lowering below the locked sum is rejected with the same message as US-16. |

### 3.5 Timeline (FR-07, FR-08) — Must

| ID | Story | Acceptance criteria |
|---|---|---|
| US-20 | I see tasks by due date. | Groups in order: Overdue, This week, Later, Done. Each row shows title, due date, priority, category. |
| US-21 | I see when time is short. | A task whose ideal date was already past carries a "Compressed" badge with the explanation "Scheduled closer than ideal because the event is soon." |
| US-22 | I manage tasks. | Add, edit, complete (checkbox), reopen, delete. Completing stamps a completion time; reopening clears it. |
| US-23 | I filter. | Filter by status and by date range. Filters persist in the URL query string. |

### 3.6 Vendors (FR-09, FR-10) — Must (FR-10 Should)

| ID | Story | Acceptance criteria |
|---|---|---|
| US-24 | I see what to book. | Items grouped by category, each with a need, a description, a must-have flag, and 3–5 "Questions to ask". A "Copy questions" button copies them as plain text. |
| US-25 | I move items through the pipeline. | Status select: `not_started`, `contacted`, `quoted`, `booked`, `declined`. Choosing `quoted` or `booked` without a vendor name shows the field error "Add the vendor's name first." |
| US-26 | I record vendor details. | Fields: vendor name, contact (free text), quote amount, notes. These fields are private to the user and never reach the model. |
| US-27 | I link an expense to a vendor. | The expense form offers a vendor select. Deleting the vendor item keeps the expense and clears the link. |

### 3.7 Ideas (FR-11, FR-12) — Must

| ID | Story | Acceptance criteria |
|---|---|---|
| US-28 | I browse ideas by kind. | Eight ideas per generation; kinds: `theme`, `decor`, `food_drink`, `activity`, `entertainment`, `keepsake`; cost tier shown as Low, Medium, or High (never a price). |
| US-29 | I give feedback. | Like, Dislike, and Save are toggle buttons with `aria-pressed`. Like and Dislike are mutually exclusive; Save is independent. Updates appear instantly and roll back on failure. |
| US-30 | Regeneration respects me. | Saved, liked, and disliked ideas are never deleted by regeneration; disliked titles are excluded from the next prompt. |

### 3.8 Assistant (FR-13) — Should

| ID | Story | Acceptance criteria |
|---|---|---|
| US-31 | I ask about my plan. | A chat page offers three starter prompts: "What should I do this week?", "Am I on budget?", "What should I ask my {vendor}?" where `{vendor}` is the lowercase label of the first vendor-eligible category in the event type's catalogue (for example, "venue"). Answers stream word by word. |
| US-32 | I know what it sees and cannot do. | A fixed note reads: "The assistant sees your budget numbers, task titles, and vendor needs. It never sees your name, email, or notes, and it can't change your plan." |
| US-33 | I clear the conversation. | "Clear conversation" deletes all messages for the event after one confirmation. |

### 3.9 Export (FR-14) — Should

| ID | Story | Acceptance criteria |
|---|---|---|
| US-34 | I download my plan. | "Download plan (.md)" returns a Markdown summary with event facts, budget table, open tasks, vendor checklist, and saved ideas. |
| US-35 | I add the timeline to my calendar. | "Download calendar (.ics)" returns all-day entries for every task that is not done, plus the event day; the file imports into Google Calendar and Apple Calendar without error. |

## 4. Screens and navigation

| Route | Screen | Auth | Primary content |
|---|---|---|---|
| `/` | Landing | Public (signed-in users redirect to `/events`) | Product pitch, two calls to action: Create account, Sign in |
| `/sign-in` | Sign in | Public | Email, password, Google button when enabled |
| `/sign-up` | Sign up | Public | Name, email, password, Google button when enabled |
| `/events` | Event list | Required | Event cards, "New event" button, empty state |
| `/events/new` | Create event | Required | Eight-field form (US-05) |
| `/events/[eventId]` | Overview | Required | Header (title, date, days remaining), four section summaries, generation status |
| `/events/[eventId]/budget` | Budget | Required | Category table, expense lists, add-expense dialog |
| `/events/[eventId]/timeline` | Timeline | Required | Grouped tasks, filters, add-task dialog, calendar export |
| `/events/[eventId]/vendors` | Vendors | Required | Grouped vendor items, detail drawer |
| `/events/[eventId]/ideas` | Ideas | Required | Idea cards, filters (All, Saved, Liked), regenerate control |
| `/events/[eventId]/assistant` | Assistant | Required | Chat, starter prompts, privacy note |
| `/events/[eventId]/settings` | Event settings | Required | Edit details, plan download, delete event |
| `/account` | Account | Required | Name and email (read-only), sign out, delete account |

**Navigation.** A top bar holds the product name (links to `/events`), the account menu, and a skip link ("Skip to main content") as the first focusable element. Inside an event, a tab list shows Overview, Budget, Timeline, Vendors, Ideas, Assistant, Settings. Below 640 px the tab list scrolls horizontally and scrolls the active tab into view.

**Overview content.** Header row; budget summary (allocated, committed, paid, remaining, and counts of categories by status); next five open tasks; vendor counts by status; counts of saved ideas; "Regenerate" menu.

**Generation redirect.** After creation, the overview opens with `?generating=1`; the page starts generation once and removes the parameter on `run.completed`.

## 5. Look and feel

**Personality:** warm, calm, organized. A paper-like canvas with one confident accent. Dense where users work (tables, lists), airy where they decide (forms, ideas).

### 5.1 Design tokens

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FAF8F5` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, dialogs, inputs |
| `--color-text` | `#1C1917` | Body text |
| `--color-muted` | `#57534E` | Secondary text |
| `--color-border` | `#E7E5E4` | Dividers, input borders |
| `--color-primary` | `#9F1239` | Primary buttons, links, active tab |
| `--color-primary-hover` | `#881337` | Hover and pressed |
| `--color-on-primary` | `#FFFFFF` | Text on primary |
| `--color-ok-bg` / `--color-ok-fg` | `#DCFCE7` / `#166534` | Status `ok` |
| `--color-warn-bg` / `--color-warn-fg` | `#FEF3C7` / `#92400E` | Status `near_limit` |
| `--color-over-bg` / `--color-over-fg` | `#FEE2E2` / `#991B1B` | Status `over`, destructive actions |
| `--color-focus` | `#1D4ED8` | 2 px focus ring, 2 px offset |
| `--radius-card` / `--radius-control` | `12px` / `8px` | Corners |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px | All gaps and padding |
| Type family | Inter, self-hosted through `next/font`, fallback `system-ui, sans-serif` | All text |
| Type scale | 14 / 16 / 20 / 24 / 32 px; body 16 px; line-height 1.5 | Headings use 20, 24, 32 at weight 600 |
| Motion | 150 ms ease-out for hover, dialog, and skeleton-to-content fades; disabled under `prefers-reduced-motion: reduce` | All transitions |

All text and control colors above meet WCAG 2.2 AA contrast (4.5:1 for text, 3:1 for control boundaries).

### 5.2 Components

| Component | Variants and behavior |
|---|---|
| Button | `primary`, `secondary`, `ghost`, `destructive`; minimum 44 × 44 px hit area on touch widths, never below 24 × 24 px |
| TextField, Select, Textarea | Visible label above the field; helper text below; error text below and linked with `aria-describedby`; `aria-invalid` when invalid |
| MoneyField | Text input with `inputmode="decimal"`, currency symbol prefix; parses with the exact decimal rules of the event currency; rejects extra decimals instead of rounding |
| Dialog | Radix Dialog; focus trapped; Escape closes; focus returns to the trigger |
| Tabs | Radix Tabs-style link tabs; active tab has underline and `aria-current="page"` |
| Badge | Neutral, ok, warn, over; always contains text |
| ProgressBar | `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` and a visible percentage; bar width is capped at 100% |
| Toast | Radix Toast; `aria-live="polite"`; auto-dismiss after 6 s except errors, which stay until dismissed |
| Skeleton | Gray block with a 1.2 s shimmer; static under reduced motion |
| EmptyState | Heading, one sentence, one primary action |

### 5.3 Formatting rules

- Money: `Intl.NumberFormat` with the event currency; locale `en-IN` for INR, `en-US` for all other currencies. Locale is fixed per currency so server and client render identical text.
- Dates: `Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: event.timezone })`.
- Relative time ("in 12 days", "3 days ago") uses whole days in the event time zone.
- Amounts are right-aligned in tables and use tabular numerals (`font-variant-numeric: tabular-nums`).

### 5.4 Layout

- Single column below 768 px; content max width 1120 px above; 24 px page padding (16 px below 480 px).
- The layout MUST work from 320 px wide with no horizontal page scroll; tables scroll inside their own container.
- Cards stack with 16 px gaps; section headings use 24 px.

## 6. Content and tone

**Voice:** second person, present tense, plain words, sentences under 20 words. No emoji. No exclamation marks anywhere; success messages are plain statements.

| Situation | Copy |
|---|---|
| Event created | "Your event is ready. Building your plan now." |
| Section done | "Budget ready." / "Timeline ready." / "Vendors ready." / "Ideas ready." |
| Section failed | "We couldn't build your {section}. Your other sections are fine. Try again." |
| All sections failed | "We couldn't reach the planning service. Your event is saved. Try again in a few minutes." |
| Rate limited | "You're going a little fast. Try again in {seconds} seconds." |
| Daily quota reached | "You've used today's {n} plan builds. They reset at {time}." |
| Stale edit | "This event changed in another tab. Reload to continue." |
| Locked above total | "Locked amounts can't exceed your total budget." |
| No unlocked category left | "Unlock at least one category so the rest of the budget has somewhere to go." |
| Event in the past | "This event's date has passed, so plan generation is off." |
| Not found (any resource) | "We couldn't find that." |
| Unexpected error | "Something went wrong on our side. Try again. If it keeps happening, quote this code: {requestId}." |

Error-to-copy mapping for every API error code is defined in `spec.md` §6.5.

## 7. States: empty, loading, error

| Surface | Empty | Loading | Error |
|---|---|---|---|
| Event list | "No events yet. Create your first event." + button | 3 card skeletons | Inline retry panel |
| Overview sections | "Not generated yet." + "Generate" button | Skeleton per section | Per-section message + "Try again" |
| Budget table | Always populated (categories exist from creation) | 8 row skeletons | Inline retry panel |
| Expenses in a category | "No expenses yet." | 2 row skeletons | Toast on failed save; row restores prior values |
| Timeline | "No tasks yet. Generate your timeline or add one." | 6 row skeletons | Inline retry panel |
| Vendors | "No vendor items yet." + "Generate" | 4 card skeletons | Inline retry panel |
| Ideas | "No ideas yet." + "Generate" | 8 card skeletons | Inline retry panel |
| Assistant | Starter prompts only | Typing indicator (three dots, static under reduced motion) | Message-level error with "Send again" |

**Optimistic updates.** Task completion, vendor status, idea feedback, and expense edits update instantly and roll back with a toast on failure. Budget allocation edits and total changes are NOT optimistic because the server computes the rebalance; the edited row shows a spinner until the response arrives.

## 8. Accessibility

Target: WCAG 2.2 AA (NFR-06). Requirements:

1. Every page has one `<h1>`, ordered headings, and landmarks (`header`, `nav`, `main`).
2. Every interactive control is reachable and operable by keyboard; visible focus ring on all of them.
3. Form errors are announced: the error summary or the first invalid field receives focus on submit.
4. Generation progress and toasts use `aria-live="polite"`; the generation status line reads, for example, "Budget ready. Timeline ready."
5. Status is conveyed by text plus color. Lock state has an accessible name ("Locked" or "Unlocked") on the toggle.
6. Toggle buttons (like, dislike, save) expose state with `aria-pressed`.
7. Pointer targets are at least 24 × 24 CSS px (WCAG 2.5.8); touch controls are 44 × 44 px.
8. Motion respects `prefers-reduced-motion`.
9. Assistant output renders as plain text; no model-generated links or images are rendered.
10. CI runs `eslint-plugin-jsx-a11y` and axe on every top-level page; zero `serious` or `critical` findings is a merge gate.

## 9. Quality bars

| Bar | Target | Source |
|---|---|---|
| Server latency (excluding model calls) | p95 ≤ 200 ms reads, ≤ 300 ms writes at 20 concurrent users | NFR-01 |
| First plan section | ≤ 8 s p95 | NFR-02 |
| Full plan | ≤ 30 s p95 | NFR-02 |
| Non-AI availability | 99.5% monthly | NFR-03 |
| Initial JavaScript, authenticated pages | ≤ 170 KB gzip | NFR-14 |
| Browsers | Last two versions of evergreen browsers; layout from 320 px | NFR-12 |
| Accessibility | Lighthouse ≥ 95; axe zero serious or critical | SC-06 |
| New-user time to complete plan | ≤ 3 minutes after sign-up | SC-01 |

## 10. Release criteria

Version 1.0.0 ships when all of the following are true:

1. Every `Must` story in §3 passes its acceptance criteria in an automated test.
2. Every `Should` story either passes or is recorded as dropped in `scope.md` §5 with a reason.
3. SC-01 through SC-07 are met.
4. No open defect marks a violation of product principle 1 (exact numbers) or principle 3 (partial success).
5. The residual-risk list in `spec.md` §9.4 is reviewed and unchanged or updated.
