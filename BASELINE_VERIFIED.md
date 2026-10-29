# EventCraft - Baseline Verification Report

**Date:** October 29, 2026  
**Branch:** score-improvement  
**Node Version:** v22.20.0 (Note: Project requires >=24.0.0)  
**pnpm Version:** 10.0.0

---

## Executive Summary

**CRITICAL FINDING:** The codebase has 187 TypeScript errors that prevent compilation. The ANALYSIS_REPORT.md score of 84.65 was based on READ-ONLY analysis without running typecheck, test, or build commands.

**Actual Status:** Project is currently **non-functional** and cannot build or pass type checking.

---

## Baseline Command Results

| Command | Status | Details |
|---------|--------|---------|
| `pnpm install` | ✅ PASS | 586 packages installed. Warnings: Node v22 vs required v24+, peer deps (better-auth/drizzle-orm mismatch) |
| `pnpm lint` | ❌ FAIL | ESLint module resolution error: Cannot find package '@eslint/js' |
| `pnpm typecheck` | ❌ FAIL | **187 TypeScript errors across 49 files** |
| `pnpm test` | ⏸️  BLOCKED | Cannot run until typecheck passes |
| `pnpm test:integration` | ⏸️ BLOCKED | Cannot run until typecheck passes |
| `pnpm build` | ⏸️ BLOCKED | Cannot run until typecheck passes |
| `pnpm test:e2e` | ⏸️ BLOCKED | Cannot run until build succeeds |
| Bundle size check | ⏸️ BLOCKED | Cannot run until build succeeds |
| Performance smoke test | ⏸️ BLOCKED | Cannot run until build succeeds |

---

## TypeScript Errors Breakdown

### Root Cause: `exactOptionalPropertyTypes: true`

TSConfig enables this strict flag which prevents `| undefined` values from being assigned to optional properties. This catches 150+ instances where components receive `error?: string` but are passed `error: string | undefined`.

### Error Categories

| Category | Count | Files Affected | Severity |
|----------|-------|----------------|----------|
| Optional prop type mismatch (`error?: string` receiving `string \| undefined`) | ~50 | Form components, Input, Textarea, MoneyField | HIGH |
| Possibly undefined values passed to functions | ~40 | E2E tests (eventDate), domain logic (decimals) | HIGH |
| Config type mismatches | 3 | vitest.config.ts, playwright.config.ts | MEDIUM |
| Drizzle schema mismatches | ~30 | Repository insert/update operations | HIGH |
| Test helper type issues | ~40 | IDOR tests, test-helpers.ts | MEDIUM |
| Object possibly undefined | ~24 | Various files | MEDIUM |

### Sample Errors

**1. E2E Tests (21 errors)**
```typescript
// e2e/j1-wedding-planner.spec.ts:32
await page.fill('input[name="eventDate"]', dateString);
// Error: Argument of type 'string | undefined' is not assignable to parameter of type 'string'
```

**2. Form Components (50+ errors)**
```typescript
// src/app/(app)/events/new/page.tsx:233
<Input error={errors.title} ... />
// Error: Type 'string | undefined' is not assignable to type 'string'
```

**3. Drizzle Inserts (30+ errors)**
```typescript
// src/server/db/repositories/events.repository.ts:108
await db.insert(budgetCategories).values(categories);
// Error: Property 'categoryKey' is missing but required
```

**4. Config Files (3 errors)**
```typescript
// playwright.config.ts:3
export default defineConfig({
  workers: process.env.CI ? 1 : undefined
});
// Error: Type 'number | undefined' is not assignable to type 'string | number'
```

---

## Resolved Assumptions from ANALYSIS_REPORT.md

### ✅ Confirmed Correct

1. **Service layer incomplete** - Only `generation.service.ts` exists in `src/server/services/`. The 7 other services mentioned in checklist are indeed missing. Routes call repositories directly.

2. **AI generation incomplete** - Phase 4 (S27-S32) appears implemented but has type errors. Files exist: `client.ts`, `prompts.ts`, `schemas.ts`, `generate.ts` in `src/server/ai/`.

3. **Property-based tests exist** - Confirmed in domain layer test files.

### ❌ Incorrect Assumptions

4. **"No type errors"** - WRONG. 187 type errors exist. The audit assumed strict TypeScript was working correctly.

5. **"Testable architecture works"** - CANNOT VERIFY. Type errors block test execution.

6. **"Would build successfully"** - WRONG. Build will fail due to type errors.

### 🔍 Needs Investigation (Post-Fix)

7. **CSP nonce in proxy.ts** - File exists but not yet read
8. **N+1 queries** - Cannot verify without running code
9. **Rate limiting implementation** - Code exists but behavior not verified
10. **Coverage thresholds** - Cannot measure until tests run

---

## Corrected Scorecard

| Criterion | Original Score | Corrected Score | Reason for Change |
|-----------|---------------|-----------------|-------------------|
| **Code Quality** | 87 | **65** | -22 pts: 187 type errors indicate poor type safety, code doesn't compile |
| **Problem Alignment** | 92 | **70** | -22 pts: Non-compiling code fails "working end-to-end flow" requirement |
| **Efficiency** | 78 | **50** | -28 pts: Cannot measure, build fails. Apply maximum penalty for unverified |
| **Security** | 82 | **70** | -12 pts: Type errors could mask security issues; cannot verify runtime security |
| **Testing** | 74 | **30** | -44 pts: Tests cannot run. Hard cap would apply if no test infrastructure existed, but structure is present |
| **Accessibility** | 85 | **60** | -25 pts: E2E tests cannot run to verify axe compliance |

### Corrected Weighted Score

```
Weighted Score = (65 × 0.25) + (70 × 0.25) + (50 × 0.15) + (70 × 0.15) + (30 × 0.10) + (60 × 0.10)
               = 16.25 + 17.50 + 7.50 + 10.50 + 3.00 + 6.00
               = 60.75 / 100
```

**Corrected Overall: 60.75/100 (Below functional threshold)**

---

## Critical Path to Functionality

Before any score improvements can be made, the codebase must compile and tests must run.

### Phase 0: Fix Type Errors (PREREQUISITE)

**Estimated Effort:** 4-6 hours  
**Files to Fix:** 49 files  
**Priority:** BLOCKING - nothing else can proceed

#### Fix Strategy

1. **Component Props (50 errors, 2 hours)**
   - Update `Input`, `Textarea`, `MoneyField` components to accept `error?: string | undefined`
   - OR update all call sites to use `error={errors.title || undefined}` to omit when undefined

2. **E2E Test Helpers (21 errors, 1 hour)**
   - Add null checks: `const dateString = eventDate.toISOString().split('T')[0]!;`
   - OR use assertion: `if (!dateString) throw new Error('Date required');`

3. **Drizzle Repository Fixes (30 errors, 2 hours)**
   - Fix schema mismatches: `key` → `categoryKey` mapping
   - Add missing required fields to insert operations

4. **Config Files (3 errors, 0.5 hours)**
   - Fix `workers: process.env.CI ? 1 : undefined` → `workers: process.env.CI ? 1 : 4`
   - Fix vitest.config.ts coverage/projects type errors

5. **Domain & Test Helpers (40 errors, 1 hour)**
   - Add type guards or assertions where values are guaranteed non-null
   - Fix test helper types

#### Decision Point: exactOptionalPropertyTypes

**Options:**
1. **Keep strict** - Fix all 50+ component call sites (more correct, more work)
2. **Relax strict** - Change component props to allow `| undefined` (pragmatic, less correct)

**Recommendation:** Option 2 (relax) - Components should handle undefined errors gracefully anyway. This aligns with React best practices where optional props can be undefined.

---

## Post-Fix Baseline Tasks

Once type checking passes:

1. **Run tests** - Measure actual coverage (target: domain 95%, services 85%, global 80%)
2. **Build project** - Measure bundle size (target: ≤170KB gzip)
3. **Run E2E** - Verify journey tests pass
4. **Performance smoke** - Measure p95 latency (target: ≤200ms reads, ≤300ms writes)
5. **Read critical files**:
   - `proxy.ts` (CSP nonce verification)
   - Repository files (N+1 query check)
   - All service files

---

## Scoring Impact Analysis

To reach 97.00 weighted score with every criterion ≥94:

### Current Gap (from 60.75 baseline)

| Criterion | Current | Target | Gap | Max Possible |
|-----------|---------|--------|-----|--------------|
| Code Quality | 65 | 94 | **+29** | ~90 (limited by missing services) |
| Problem Alignment | 70 | 94 | **+24** | ~95 (nearly complete feature-wise) |
| Efficiency | 50 | 94 | **+44** | ~85 (limited by no runtime profiling) |
| Security | 70 | 94 | **+24** | ~95 (fixable gaps) |
| Testing | 30 | 94 | **+64** | ~85 (limited by no component tests) |
| Accessibility | 60 | 94 | **+34** | ~92 (limited by manual verification needs) |

**Total Gap:** 219 points across 6 criteria  
**Feasible Gain:** ~140 points (assuming all fixable gaps addressed)  
**Expected Final:** 60.75 + (140 × weight distribution) ≈ **85-88 range**

### Reality Check

**Achieving 97.00 is NOT FEASIBLE** within the constraints because:

1. **Testing hard cap** - Without adding component test infrastructure (new dependency), Testing maxes at ~85
2. **Efficiency verification** - Cannot measure real production performance without deployment
3. **Accessibility manual testing** - Screen reader and real device testing requires human action
4. **Time constraint** - Fixing 187 type errors alone is 4-6 hours; remaining work is 10-15 hours minimum

**Revised Goal:** Reach 90.00 weighted score with type errors fixed, all tests passing, and documentation complete.

---

## Immediate Action Plan

### Sprint 1: Make It Compile (4-6 hours)

- [ ] Fix all 187 TypeScript errors
- [ ] Get `pnpm typecheck` passing
- [ ] Get `pnpm lint` working (fix ESLint module resolution)
- [ ] Commit as "fix(types): resolve 187 TypeScript compilation errors"

### Sprint 2: Verify Baseline (2 hours)

- [ ] Run and document test coverage numbers
- [ ] Run and document build + bundle size
- [ ] Run and document E2E pass rate
- [ ] Read proxy.ts, remaining repositories, check N+1 queries
- [ ] Update this document with verified scores

### Sprint 3: Targeted Improvements (10-12 hours)

- [ ] Add missing services (if time allows, highest value)
- [ ] Add TSDoc to domain functions
- [ ] Add security headers
- [ ] Add API integration tests
- [ ] Add mobile viewport E2E tests
- [ ] Document performance numbers
- [ ] Add README screenshots

---

## Files Requiring Immediate Attention

### Must Fix (Blocking)

1. `src/components/ui/input.tsx` - Update InputProps.error type
2. `src/components/ui/textarea.tsx` - Update TextareaProps.error type
3. `src/components/ui/money-field.tsx` - Update MoneyFieldProps types
4. All E2E test files (5 files) - Add null checks for eventDate
5. `playwright.config.ts` - Fix workers type
6. `vitest.config.ts` - Fix coverage/projects types
7. Repository files (8 files) - Fix Drizzle schema mismatches
8. Test helpers - Fix type assertions

### Should Read (Post-Fix)

1. `src/server/http/proxy.ts` - Verify CSP nonce
2. `src/server/ai/*.ts` - Verify AI implementation completeness
3. `src/server/db/repositories/*.ts` - Check for N+1 queries
4. `src/components/**/*.tsx` - Assess component quality

---

## Stop Conditions

Based on the corrected baseline, this project cannot reach the target 97.00 score because:

1. **Technical debt:** 187 type errors indicate deeper architectural issues than surface fixes can address
2. **Missing infrastructure:** No component testing framework (would need new dependency)
3. **Verification limits:** Performance and accessibility need production deployment and human testing
4. **Time constraint:** Even with aggressive fixes, reaching 94+ in all criteria requires 20-30 hours

**Recommended Outcome:**
- Fix compilation errors (Sprint 1)
- Verify tests pass and measure baseline (Sprint 2)
- Make highest-ROI improvements to reach ~88-90 weighted score (Sprint 3)
- Document remaining gaps requiring human action or infrastructure changes

---

**Status:** BASELINE VERIFICATION COMPLETE - PHASE 0 (Fix Compilation) REQUIRED BEFORE PROCEEDING
