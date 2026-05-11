# Tasks: Ballot Research Tool

**Feature**: 001 - ballot-research-tool  
**Total Tasks**: 32  
**Date**: 2026-05-11  

---

## Phase 1: Setup

- [ ] T001 Create `src/types/index.ts` with TypeScript interfaces for StateData, Election, Registration, EarlyVoting, VotingRules, Resources, DeadlineStatus, and ZipToStateMap
- [ ] T002 Update `src/app/layout.tsx` with correct metadata (title: "Voter Choice — AI Ballot Research Tool"), skip-to-content link, and semantic HTML structure
- [ ] T003 Update `src/app/globals.css` to ensure Tailwind base styles are properly configured and add any custom CSS variables needed for deadline status colors

---

## Phase 2: Foundational Library Functions

- [ ] T004 [P] Create `src/lib/zipLookup.ts` — exports `lookupZip(zip: string): string[] | null` that loads `src/data/zip-to-state.json` and returns array of state codes or null
- [ ] T005 [P] Create `src/lib/stateData.ts` — exports `getStateData(stateCode: string): Promise<StateData | null>` that dynamically imports the correct state JSON from `src/data/states/`
- [ ] T006 [P] Create `src/lib/deadlineUtils.ts` — exports `getDeadlineStatus(isoDate: string): DeadlineStatus` with correct tier logic (passed/red/yellow/green) and `formatDate(isoDate: string): string`
- [ ] T007 Create `src/lib/ballotPrompt.ts` — exports `BASE_BALLOT_PROMPT` string constant from the "You are a nonpartisan civic research assistant..." section of docs/BALLOT_PROMPT.md
- [ ] T008 Create `src/lib/promptBuilder.ts` — exports `buildCustomizedPrompt(stateData: StateData, zipCode: string, nextElection: Election): string` that generates the pre-filled context block and concatenates with BASE_BALLOT_PROMPT

---

## Phase 3: User Story 1 — Zip Lookup and State Info Display

**Goal**: User can enter a zip code, validate input, and see state election info.  
**Independent test criteria**: `zip-input`, `zip-submit`, `zip-error`, `state-info`, `election-name`, `election-date`, `registration-status`, `state-selector`, `not-found-message`, `no-election-message` are all present and functional.

- [ ] T009 [US1] Create `src/components/ZipLookup.tsx` — 'use client' component with:
  - State: `zipValue`, `submittedZip`, `states`, `selectedState`, `stateData`, `nextElection`, `error`, `isLoading`
  - `data-testid="zip-input"` on the input
  - `data-testid="zip-submit"` on the submit button
  - `data-testid="zip-error"` on the error container (visible only when error exists)
  - Validates: empty → "Please enter a zip code"; non-numeric/wrong length → "Please enter a valid 5-digit zip code"
  - On valid submit: looks up state(s) via `lookupZip`, shows state selector if multi-state, loads state data
  - Handles Enter key submission
  - Uses `aria-live="polite"` for loading and `role="alert"` for errors

- [ ] T010 [US1] Add multi-state selector to `ZipLookup.tsx`:
  - When multi-state zip submitted, render `data-testid="state-selector"` dropdown/selector
  - "This zip code spans multiple states. Which state are you voting in?"
  - On selection, load that state's data

- [ ] T011 [US1] Create `src/components/StateInfoCard.tsx` — client component receiving `stateData`, `nextElection`, `zipCode` props:
  - Root element: `data-testid="state-info"`, shows state name
  - `data-testid="election-name"` showing election name
  - `data-testid="election-date"` showing formatted election date
  - `data-testid="registration-status"` with registration deadline statuses using `getDeadlineStatus()`
  - Deadline status shows color tier AND text label (e.g., "12 days left", "Passed")
  - Shows early voting info if available
  - Shows voter ID and phone-at-polls rules
  - Shows links to resources (county election office, sample ballot)
  - `data-testid="no-election-message"` shown when `nextElection` is null
  - All registration deadline passes show the "check registration status" alert

- [ ] T012 [US1] Add `data-testid="not-found-message"` to `ZipLookup.tsx` for when zip is not in dataset, with text "We don't have data for this zip code yet..."

- [ ] T013 [US1] Write Vitest unit tests in `src/lib/__tests__/zipLookup.test.ts` — tests for known TX/CA/NH zips, multi-state zip, unknown zip
- [ ] T014 [US1] Write Vitest unit tests in `src/lib/__tests__/deadlineUtils.test.ts` — tests for each status tier (passed, red ≤3 days, yellow 4-14 days, green 15+ days)

---

## Phase 4: User Story 2 — Prompt Generation and Copy

**Goal**: User sees the customized AI prompt and can copy it to clipboard.  
**Independent test criteria**: `prompt-output` contains state-specific content and zip code; `copy-button` is visible; `copy-confirmation` appears after click.

- [ ] T015 [US2] Create `src/components/PromptOutput.tsx` — client component receiving `prompt: string` prop:
  - Root element: `data-testid="prompt-output"` wrapping the full prompt text
  - Clear visual separation between base prompt and pre-filled context block (e.g., horizontal rule)
  - Instructions above prompt: "Copy this prompt and paste it as your first message in any AI chatbot"
  - `data-testid="copy-button"` button with text "Copy to Clipboard"
  - On click: uses `navigator.clipboard.writeText(prompt)`, shows `data-testid="copy-confirmation"` ("Copied!" with checkmark) for 2 seconds
  - Clipboard fallback: if API unavailable, select text in prompt area and show keyboard copy instructions
  - Prompt area scrollable on mobile; copy button stays visible (sticky or fixed positioning pattern)

- [ ] T016 [US2] Wire up `promptBuilder.ts` in `ZipLookup.tsx` — after state data loads, call `buildCustomizedPrompt()` and pass result to `PromptOutput`

- [ ] T017 [US2] Write Vitest unit tests in `src/lib/__tests__/promptBuilder.test.ts` — tests that output includes state name, zip code, election name, registration deadlines, voter ID info

---

## Phase 5: Static Sections and Accessibility Polish

- [ ] T018 [P] Create `src/components/HeroSection.tsx` — static server component:
  - h1 headline explaining the tool
  - Subtitle (2-3 sentences)
  - List of supported chatbots (Claude, ChatGPT, Gemini, Grok) with external links
  - Links have `rel="noopener noreferrer"` and `target="_blank"` with visible indicators

- [ ] T019 [P] Create `src/components/TipsSection.tsx` — static server component:
  - Tips for using the prompt effectively (from "Tips while you're in the conversation" in BALLOT_PROMPT.md)
  - Reminder that AI can make mistakes and to verify with official sources
  - Proper heading hierarchy (h2)

- [ ] T020 [P] Create `src/components/Footer.tsx` — static server component:
  - "Share this tool" call to action
  - Attribution: "Created by a human using AI tools"
  - Appropriate landmark role (`<footer>`)

- [ ] T021 Accessibility polish pass on all components:
  - Verify all interactive elements have visible `:focus-visible` styles in globals.css
  - Verify tab order follows visual layout
  - Verify WCAG AA color contrast for all text and status indicators
  - Verify `<label>` elements are properly associated with zip input
  - Verify skip-to-content link in layout.tsx is functional

---

## Phase 6: Integration and Wire-up

- [ ] T022 Update `src/app/page.tsx` — compose all components:
  - Import and render `HeroSection`, `ZipLookup`, `TipsSection`, `Footer`
  - Add `id="main-content"` to main content area (target for skip-to-content link)
  - Logical heading hierarchy: h1 in Hero, h2 in Tips, h2 in Footer CTAs
  - Semantic HTML: `<main>`, `<header>` (if needed), `<footer>`, `<section>` elements

- [ ] T023 Verify `next build` (or `npm run build --turbo`) succeeds with no TypeScript or build errors

- [ ] T024 Run `npm run lint` and fix any ESLint errors

- [ ] T025 Run `npx vitest run` — all unit tests must pass

- [ ] T026 Run `npx playwright test` — all e2e tests must pass

---

## Phase 7: Polish and Cross-Cutting Concerns

- [ ] T027 [P] Responsive design verification:
  - Verify mobile (375px): all interactive elements ≥ 44x44px, prompt scrollable
  - Verify tablet (768px): reasonable layout
  - Verify desktop (1280px): full layout

- [ ] T028 [P] Privacy audit:
  - Confirm no zip code or state data appears in any server log
  - Confirm no localStorage/sessionStorage/cookie usage
  - Confirm no third-party scripts or network requests

- [ ] T029 [P] Add `loading` state UI in `ZipLookup.tsx` — brief spinner/indicator after submit to prevent layout shift (even though lookup is near-instant from static JSON)

- [ ] T030 Commit all .specify artifacts: `git add .specify/ metrics/workflow-log.jsonl metrics/responder-log.jsonl && git commit -m "phase1: spec-kit specify/clarify/plan/tasks artifacts"`

---

## Dependencies

```
T001 → T004, T005, T006, T007, T008
T004, T005, T006, T007, T008 → T009, T010, T011
T009, T010, T011 → T012
T008 → T015, T016
T015, T016 → T022
T018, T019, T020 → T022
T022 → T023, T024
T023, T024 → T025, T026
```

## Parallel Opportunities

- T004, T005, T006, T007 can be implemented simultaneously
- T013, T014 can run in parallel with T015-T016
- T018, T019, T020 can be built in parallel with T009-T012

## MVP Scope

Phases 1-4 (T001-T017) constitute the functional MVP: zip input, state info, and prompt generation with copy. Phases 5-7 add static sections, accessibility polish, and verification.
