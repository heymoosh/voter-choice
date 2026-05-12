---
title: Built ballot research tool using Compound Engineering workflow
date: 2026-05-11
framework: compound-engineering
replicate: r3
---

# Built Ballot Research Tool — Compound Engineering Workflow

## Problem

Build a single-page ballot research tool using Next.js that helps U.S. voters research their ballot by entering a zip code to get a customized AI prompt.

## Solution

Implemented a fully client-side React app using Next.js 15 App Router with:
- Static JSON data for state election information (TX, CA, NH + multi-state)
- Zip-to-state lookup with multi-state handling
- Deadline calculation utilities with UTC-safe date math
- Customized prompt builder injecting state-specific context
- Copy-to-clipboard with 2-second confirmation feedback

## Key Learnings

### 1. Playwright `fill()` bypasses React controlled input state

**Problem:** Playwright's `page.fill("abcde")` sets the DOM input value directly, bypassing React's synthetic event system. A controlled component (`value={state}`) immediately re-renders and clears the DOM value back to the React state.

**Solution:** Use an **uncontrolled input** (no `value` prop, only `ref`) and read from `inputRef.current?.value` in the submit handler. This lets Playwright's fill persist in the DOM.

### 2. UTC vs local time in deadline calculations

**Problem:** `new Date("2026-05-11")` parses as midnight UTC. In CDT (UTC-5), this is 7pm May 10. Using local `getDate()` methods returned May 10, not May 11.

**Solution:** Use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` when constructing UTC noon reference times. Always be explicit about UTC vs local.

### 3. Playwright strict mode violation with multiple matching `data-testid` elements

**Problem:** Multiple buttons with `data-testid="state-selector"` caused `getByTestId('state-selector').toBeVisible()` to fail in strict mode (multiple matches).

**Solution:** Place `data-testid="state-selector"` on the container element, not on each individual button.

### 4. Next.js 15.5.12 WasmHash bug on Node 22.14.0

**Fix:** Add `--turbo` flag to the build script: `"build": "next build --turbo"`.

## Files Created

- `src/types/state.ts` — TypeScript types for state data schema
- `src/lib/stateRegistry.ts` — zip-to-state lookup and state data loader
- `src/lib/deadlineUtils.ts` — deadline calculation and date formatting utilities
- `src/lib/promptBuilder.ts` — builds customized prompt with injected context
- `src/app/page.tsx` — main page component
- `src/__tests__/deadlineUtils.test.ts` — unit tests (16 tests)
- `src/__tests__/promptBuilder.test.ts` — unit tests (11 tests)
- `docs/plans/2026-05-11-001-feat-ballot-research-tool-plan.md` — CE plan file

## Test Results

- ESLint: 0 errors, 2 warnings (complexity)
- Vitest: 27/27 passing
- Playwright: 42/42 passing
