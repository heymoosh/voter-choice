---
title: "feat: Build Ballot Research Tool — Voter Choice Phase 1"
type: feat
status: active
date: 2026-05-11
---

# feat: Build Ballot Research Tool — Voter Choice Phase 1

## Overview

Build a single-page Next.js 15 web application that helps U.S. voters research their ballot. Users enter a zip code to get their state's election information and a customized AI prompt they can copy-paste into any AI chatbot (Claude, ChatGPT, Gemini, Grok). No data is stored server-side; all state data is served from static JSON files.

## Problem Statement / Motivation

Voters need a quick, privacy-respecting way to research their ballots. This tool generates a customized prompt with state-specific election data that works with any free AI chatbot. The current repo has the scaffold (Next.js 15 app, state data JSON files, e2e tests) but no functional UI — just the default Next.js placeholder page.

## Proposed Solution

Replace the default Next.js page with a complete ballot research tool implementing these sections:
1. Hero section with tool explanation and chatbot links
2. Zip code entry form with validation
3. State info display (election name/date, registration deadlines, early voting, voting rules, resources)
4. Customized prompt output with copy-to-clipboard
5. Tips section (static content)
6. Footer with attribution

Data flows: zip code → static JSON lookup → state data → prompt generation → UI display. All computation runs client-side or via Next.js server components/API routes.

## Technical Considerations

### Architecture
- **Page:** `src/app/page.tsx` — Replace default with the ballot tool UI
- **Components:** Create dedicated components for each section
  - `ZipForm` — zip code input with validation
  - `StateInfoCard` — election info display (data-testid: `state-info`, `election-name`, `election-date`, `registration-status`)
  - `PromptOutput` — prompt display with copy button (data-testid: `prompt-output`, `copy-button`, `copy-confirmation`)
  - `StateSelector` — multi-state zip disambiguation (data-testid: `state-selector`)
- **Data:** `src/data/zip-to-state.json` (exists), `src/data/states/*.json` (exists for TX, CA, NH)
- **Types:** Define `StateData` type from spec schema
- **Logic:** `src/lib/promptBuilder.ts` — Generate the customized prompt with injected state context
- **API routes:** `src/app/api/state/[code]/route.ts` — Serve state JSON (or use client-side fetch of static files)

### Key Technical Decisions
- **Client-side fetch** of static JSON files from `public/data/` (or API route) — avoids server components complexity
- **No `localStorage`/cookies** — zip code in React state only (spec hard requirement)
- **Clipboard API with fallback** — use `navigator.clipboard.writeText()` with select-all fallback for older browsers
- **Deadline status logic** — compare ISO dates against today, compute days remaining
- **Multi-state zip** — show `<select>` state selector when zip maps to 2+ states

### Performance Implications
- Static JSON lookup is instant; loading state is brief but prevents layout shift
- Mobile-first layout with Tailwind CSS breakpoints

### Security Considerations (Hard Requirements from Spec)
- No client-side persistence of any user input
- No third-party network requests from rendered page
- No server-side logging of user input
- API keys server-side only (no AI chatbot calls in this tool — users copy-paste)
- No `eval`, `Function()`, `dangerouslySetInnerHTML`, or unsanitized user input to DOM

## System-Wide Impact

- **Interaction graph:** Zip form submit → state lookup → state selector (if multi) → StateInfoCard render → PromptBuilder → PromptOutput render
- **Error propagation:** Validation errors shown inline; missing state data shows not-found message; all errors use aria-live for a11y
- **State lifecycle risks:** All state in React component state; no persistence; no risk of orphaned state
- **API surface parity:** API route `/api/state/[code]` serves JSON — consistent with client fetch
- **Integration test scenarios:** Playwright e2e tests cover happy path (TX/CA/NH), multi-state, copy button, keyboard nav, responsive

## Acceptance Criteria

- [ ] User can enter a 5-digit zip code and submit (Enter key and button)
- [ ] Valid zip displays state info card with election name, date, registration deadlines, early voting, voter ID, phone policy, links
- [ ] Valid zip generates customized prompt with state-specific context injected
- [ ] Copy button copies full prompt to clipboard; shows "Copied!" for 2 seconds
- [ ] Multi-state zip (86515) shows state selector
- [ ] Invalid/empty/non-numeric inputs show appropriate inline error messages (data-testid: `zip-error`)
- [ ] Unknown zip (00000) shows not-found message (data-testid: `not-found-message`)
- [ ] Registration deadline statuses calculated correctly (green/yellow/red/gray + text)
- [ ] All required `data-testid` attributes present per PROJECT_SPEC.md
- [ ] Layout renders correctly at 375px, 768px, 1280px viewports
- [ ] All interactive elements keyboard-navigable; tab order correct
- [ ] Form inputs have associated labels; error messages use aria-live
- [ ] Skip-to-content link present
- [ ] Heading hierarchy h1 → h2 → h3
- [ ] `npm run lint` passes
- [ ] `npx vitest run` passes
- [ ] `npx playwright test` passes

## Success Metrics

All Playwright e2e tests pass. Vitest unit tests pass. Lint clean. All data-testid attributes verified by tests.

## Dependencies & Risks

- **Risk:** Next.js 15.5.12 has WasmHash webpack bug on Node 22.14.0 — fix with `--turbo` flag on build script
- **Dependency:** Existing state JSON data at `src/data/states/` and `src/data/zip-to-state.json`
- **Dependency:** Existing e2e tests at `e2e/ballot-tool.spec.ts` define the acceptance contract
- **Risk:** Clipboard API may not be available in test environment — use permission grant in playwright config

## Sources & References

- **Spec:** `docs/PROJECT_SPEC.md` — full feature definition
- **Prompt:** `docs/BALLOT_PROMPT.md` — prompt text to inject
- **Data:** `src/data/zip-to-state.json`, `src/data/states/TX.json`, `CA.json`, `NH.json`
- **Tests:** `e2e/ballot-tool.spec.ts` — acceptance test suite

## Implementation Tasks

### Setup
- [x] Read PROJECT_SPEC.md and existing data files
- [ ] Fix build script: add `--turbo` to `package.json` build command

### Types & Data Layer
- [ ] Create `src/types/state.ts` — StateData, Election, Registration, etc.
- [ ] Create `src/app/api/state/[code]/route.ts` — serve state JSON
- [ ] Create `src/lib/promptBuilder.ts` — buildFullPrompt(stateData, zip) → string

### Components
- [ ] Create `src/components/ZipForm.tsx`
- [ ] Create `src/components/StateInfoCard.tsx`
- [ ] Create `src/components/StateSelector.tsx`
- [ ] Create `src/components/PromptOutput.tsx`

### Page Integration
- [ ] Rewrite `src/app/page.tsx` with full ballot tool UI
- [ ] Update `src/app/layout.tsx` metadata

### Tests (Unit)
- [ ] Create `tests/lib/promptBuilder.test.ts` — unit test prompt generation
- [ ] Create `tests/lib/stateDataLoader.test.ts` — unit test state lookup

### Quality
- [ ] Run `npm run lint` and fix issues
- [ ] Run `npx vitest run` and fix failures
- [ ] Run `npx playwright test` and fix failures
