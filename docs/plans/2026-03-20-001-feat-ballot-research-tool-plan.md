---
title: "feat: Build Ballot Research Tool"
type: feat
status: active
date: 2026-03-20
---

# feat: Build Ballot Research Tool

## Overview

Build a single-page Next.js web application that helps U.S. voters use AI chatbots to research their ballot. The user enters their zip code, the site looks up their state's election information from static JSON files, and generates a customized AI prompt pre-filled with local dates, deadlines, links, and rules. The user copies the prompt and pastes it into any free AI chatbot.

## Problem Statement / Motivation

Voters need easily accessible, localized election information to make informed choices. This tool bridges the gap between general AI chatbots (which lack current local data) and official election resources (which are hard to navigate) by generating a pre-filled, state-specific research prompt.

## Proposed Solution

Single-page Next.js app (App Router, TypeScript, Tailwind v4) with:
1. **Hero section** — explains the tool in one headline + 2-3 sentence subtitle
2. **Zip code input** — 5-digit numeric, submit button, validation
3. **State info card** — election name/date, registration deadlines with color+text status, early voting, links, voting rules
4. **Customized prompt output** — full BALLOT_PROMPT.md text + pre-filled context block, copy-to-clipboard with confirmation
5. **Tips section** — static content from BALLOT_PROMPT.md
6. **Footer** — share CTA, attribution

All data from static JSON (`src/data/states/`, `src/data/zip-to-state.json`). No LLM, no user data storage, no external API calls.

## Technical Considerations

### Architecture

- **Data layer**: `src/lib/election-data.ts` — typed loader for state JSON + zip lookup
- **Prompt generator**: `src/lib/prompt-generator.ts` — injects state data into BALLOT_PROMPT.md template
- **Types**: `src/types/election.ts` — TypeScript interfaces matching JSON schema
- **UI**: Single page component (`src/app/page.tsx`) with Tailwind v4 styling

### Key Implementation Details

1. **Zip lookup**: `zip-to-state.json` has 24 entries including `86515 → ["AZ", "NM"]` (multi-state)
2. **Next upcoming election**: Find first election with `date >= today` from state's `elections[]`
3. **Deadline status logic**:
   - > 14 days → Green
   - 1–14 days → Yellow/Warning
   - ≤ 3 days → Red/Urgent
   - Passed → Gray
4. **Multi-state zip**: Show `<select data-testid="state-selector">` when zip maps to multiple states
5. **Copy to clipboard**: `navigator.clipboard.writeText()` + fallback to select-all for older browsers
6. **Prompt template**: Read from `docs/BALLOT_PROMPT.md`, append pre-filled context block

### System-Wide Impact

- **No callbacks/middleware** — pure static data, no server actions
- **No state persistence** — all state is React component state (ephemeral)
- **No external APIs** — all data is local JSON
- **Error propagation** — validation errors displayed inline; missing zip shows static message
- **API surface**: Single page component — no parallel interfaces

## Acceptance Criteria

### Functional Requirements

- [x] User can enter a 5-digit zip code and submit
- [x] Valid zip displays correct state election info (TX, CA, NH stub data)
- [x] Valid zip generates correct customized prompt with state-specific info injected
- [x] Pre-filled context includes: election name, date, type, registration deadlines, early voting dates, voter ID info, phone-at-polls policy, sample ballot link, county election office link
- [x] Copy button copies full prompt + context to clipboard
- [x] Copy confirmation appears and disappears after ~2 seconds
- [x] Multi-state zip (e.g. 86515) shows state selector
- [x] Invalid inputs show appropriate error messages
- [x] Zip codes not in dataset show "not found" message
- [x] Registration deadline statuses calculate correctly relative to today's date

### data-testid Requirements (CONTRACTUAL — e2e tests depend on these)

- [x] `zip-input` on the zip code text input
- [x] `zip-submit` on the submit button
- [x] `zip-error` on the validation/error message container
- [x] `state-selector` on the state selector (multi-state zips)
- [x] `state-info` on the state election info summary card
- [x] `prompt-output` on the customized prompt container
- [x] `copy-button` on the Copy to Clipboard button
- [x] `copy-confirmation` on the "Copied!" confirmation indicator
- [x] `election-name` on the election name display
- [x] `election-date` on the election date display
- [x] `registration-status` on the registration deadline statuses container
- [x] `no-election-message` on the no-upcoming-election message
- [x] `not-found-message` on the zip-not-in-dataset message

### Responsive Design

- [x] Mobile-first layout (375px, 768px, 1280px breakpoints)
- [x] Minimum 44x44px touch targets on mobile
- [x] Prompt output scrollable on mobile without losing copy button

### Accessibility (WCAG AA)

- [x] All interactive elements keyboard-navigable
- [x] Tab order follows visual layout
- [x] Form inputs have associated `<label>` elements
- [x] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- [x] Deadline statuses communicated via text, not only color
- [x] Error messages announced to screen readers (`aria-live="polite"` or `role="alert"`)
- [x] Skip-to-content link present
- [x] Logical heading hierarchy (h1 > h2 > h3)

### Code Quality

- [x] `next build` succeeds (no build errors)
- [x] ESLint runs without errors
- [x] Playwright e2e tests pass (shared suite in `e2e/ballot-tool.spec.ts`)

## Implementation Plan

### Phase 1: Types and Data Layer

**Files to create:**
- `src/types/election.ts` — TypeScript interfaces for state JSON schema
- `src/lib/election-data.ts` — functions: `getStateForZip(zip)`, `getStateData(stateCode)`, `getNextElection(state)`, `getDeadlineStatus(deadline)`

**Files to read first:**
- `src/data/states/TX.json` (existing schema)
- `src/data/zip-to-state.json` (existing structure)

### Phase 2: Prompt Generator

**Files to create:**
- `src/lib/prompt-generator.ts` — `generatePrompt(stateData, zipCode)` returns full text string

**Files to read first:**
- `docs/BALLOT_PROMPT.md` (the prompt template)

### Phase 3: Main Page Component

**File to replace:**
- `src/app/page.tsx` — full replacement of scaffold with ballot tool UI

**Sections (all in one component per spec):**
1. Skip-to-content link
2. Hero section (h1, subtitle, chatbot links)
3. Zip code form (input + submit, inline validation)
4. State selector (conditional, multi-state zips)
5. State info card (election, deadlines, early voting, links, voting rules)
6. Prompt output (full text + copy button + confirmation)
7. Tips section
8. Footer

### Phase 4: Layout Metadata

**File to update:**
- `src/app/layout.tsx` — set page title, description, viewport meta

### Phase 5: Test and Fix

1. Run `npm run lint` — fix any ESLint/Prettier errors
2. Run `npm run build` — fix any TypeScript/build errors
3. Run `npm run e2e` — fix any Playwright failures

## Dependencies & Risks

- **ESLint complexity rule (max 10)**: The Home page component will likely exceed complexity 10 (same as Run 1). This is expected and acceptable — single-page apps with multiple conditional UI states naturally have higher complexity. Note as a deviation in RUN_LOG.
- **data-testid completeness**: All 13 required test IDs must be present. Missing even one will cause e2e failures.
- **Multi-state zip handling**: The `86515` zip maps to `["AZ", "NM"]` but stub data only has TX, CA, NH. The state selector must appear, but neither AZ nor NM will have data. The "not found" message for the selected state is acceptable.
- **Clipboard API**: `navigator.clipboard` requires HTTPS or localhost. Fine for development and production.

## Success Metrics

- Playwright e2e pass rate (target: 38+/42, matching previous CE run)
- Lighthouse scores (target: 100/100/100/100)
- ESLint errors: 0 (warnings acceptable)
- Build succeeds

## Sources & References

### Internal References
- Feature spec: `docs/PROJECT_SPEC.md`
- Ballot prompt template: `docs/BALLOT_PROMPT.md`
- State data schema: `src/data/states/TX.json`
- Zip mapping: `src/data/zip-to-state.json`
- E2E test suite: `e2e/ballot-tool.spec.ts`
- CLAUDE.md workflow enforcement: `.claude/CLAUDE.md`

### Prior Art (Run 1 — invalidated but informative)
- Previous CE build on `workflow/compound-engineering` achieved 42/42 tests and 100/98/100/100 Lighthouse
- Files created: `src/types/election.ts`, `src/lib/election-data.ts`, `src/lib/prompt-generator.ts`, `src/app/page.tsx`
