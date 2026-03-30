# Tasks: Ballot Research Tool

**Input**: Design documents from `specs/002-ballot-research-tool/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: MANDATORY — TDD Iron Law (constitution Principle IV, NON-NEGOTIABLE).
Write FAILING test → confirm RED → implement → confirm GREEN → commit.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- TDD tasks are RED (test) → GREEN (implement) pairs — never skip RED step

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript types and directory structure — required by every subsequent task

- [ ] T001 Create `src/types/election.ts` with all interfaces from `specs/002-ballot-research-tool/data-model.md`: `StateElectionData`, `Election`, `Registration`, `EarlyVoting`, `VotingRules`, `Resources`, `DeadlineStatus`, `StatusColor`, `LookupResult`, `CustomizedPrompt`
- [ ] T002 Verify `src/data/` structure: confirm `zip-to-state.json`, `states/TX.json`, `states/CA.json`, `states/NH.json` are present and match the schema in `data-model.md`; add `src/data/states/AZ.json` and `src/data/states/NM.json` stubs for multi-state zip 86515 test

---

## Phase 2: Foundational (Data Utilities — TDD)

**Purpose**: Pure library functions that ALL user stories depend on. MUST be complete before any UI work.

**⚠️ CRITICAL**: No component work can begin until this phase is complete.

**TDD NOTE**: For each utility, run `npm test -- --run` after writing the test file to confirm RED before implementing.

- [ ] T003 [P] Write failing unit tests for `lookupZip` in `src/lib/lookupZip.test.ts`: valid single-state zip returns `["TX"]`, valid multi-state zip returns `["AZ","NM"]`, unknown zip returns `[]`, non-5-digit input returns `[]`; confirm RED with `npm test -- --run`
- [ ] T004 [P] Write failing unit tests for `getStateData` in `src/lib/getStateData.test.ts`: known state code returns full `StateElectionData`, unknown code returns `null`; confirm RED
- [ ] T005 [P] Write failing unit tests for `getDeadlineStatus` in `src/lib/getDeadlineStatus.test.ts`: inject fixed `todayISO`; test > 14 days → green, ≤ 14 days → yellow, ≤ 3 days → red, daysLeft=0 → red "Today (last day)", passed → gray; confirm RED
- [ ] T006 [P] Write failing unit tests for `generatePrompt` in `src/lib/generatePrompt.test.ts`: output contains election name, date, zip, early voting block, ID rules, phone policy, resource links; no-early-voting path uses "Not available — absentee voting only"; confirm RED
- [ ] T007 Implement `src/lib/lookupZip.ts` — reads `src/data/zip-to-state.json`, returns `string[]`; run `npm test -- --run` and confirm GREEN
- [ ] T008 Implement `src/lib/getStateData.ts` — dynamic import `src/data/states/<XX>.json`, returns `StateElectionData | null`; run `npm test -- --run` and confirm GREEN
- [ ] T009 Implement `src/lib/getDeadlineStatus.ts` — accepts `(dateISO: string, todayISO?: string)`, defaults to `new Date().toISOString().split('T')[0]`; returns `DeadlineStatus`; run `npm test -- --run` and confirm GREEN
- [ ] T010 Implement `src/lib/generatePrompt.ts` — loads base prompt from `docs/BALLOT_PROMPT.md` as a TypeScript constant, injects state-specific context block per format in `docs/PROJECT_SPEC.md` §"Prompt Customization Logic"; run `npm test -- --run` and confirm GREEN
- [ ] T011 Commit: `phase1: types + data utilities — RED→GREEN`

**Checkpoint**: All utility tests GREEN. Run `npm test -- --run` and confirm 0 failures.

---

## Phase 3: User Story 1 — Voter Gets a Customized AI Prompt (Priority: P1) 🎯 MVP

**Goal**: Complete voter flow — enter zip → see state info → copy customized AI prompt.

**Independent Test**: Enter zip "73301", verify TX state info card appears with correct
election name/date, copy button copies prompt text containing "Texas".

### Tests — User Story 1 (TDD: write FIRST, confirm RED before implementing)

- [ ] T012 [P] [US1] Write failing tests for `ZipForm` in `src/components/ZipForm.test.tsx`: renders `zip-input` and `zip-submit` data-testids, empty submit shows `zip-error` "Please enter a zip code", non-numeric shows "Please enter a valid 5-digit zip code", valid 5-digit calls `onSubmit`; confirm RED
- [ ] T013 [P] [US1] Write failing tests for `StateInfoCard` in `src/components/StateInfoCard.test.tsx`: renders `state-info`, `election-name`, `election-date`, `registration-status` data-testids with TX data; early voting shown when available; "Not available" when `earlyVoting.available=false`; confirm RED
- [ ] T014 [P] [US1] Write failing tests for `PromptOutput` in `src/components/PromptOutput.test.tsx`: renders `prompt-output`, `copy-button`, `copy-confirmation` data-testids; copy button click triggers clipboard write; `copy-confirmation` visible for exactly 2s then hidden; clipboard API unavailable → shows fallback "Press Ctrl+C / Cmd+C to copy"; confirm RED

### Implementation — User Story 1

- [ ] T015 [US1] Implement `src/components/ZipForm.tsx` — `'use client'` form with input validation, `data-testid` attributes per contracts; Tailwind mobile-first styles; min 44px touch targets; associated `<label>` for input; `role="alert"` on `zip-error`; visible focus indicator on input and button; run `npm test -- --run` confirm GREEN
- [ ] T016 [US1] Implement `src/components/StateInfoCard.tsx` — displays all state election data fields, deadline statuses using `getDeadlineStatus`, early voting conditional; all required `data-testid` attributes; accessibility: ARIA labels, heading hierarchy; run `npm test -- --run` confirm GREEN
- [ ] T017 [US1] Implement `src/components/PromptOutput.tsx` — displays full prompt text in scrollable area; `Copy to Clipboard` button (keyboard-operable via Enter/Space, min 44px touch target, visible focus indicator); clipboard API with fallback (select-all + "Press Ctrl+C / Cmd+C to copy"); `aria-live="polite"` on `copy-confirmation`; copy-confirmation hides after exactly 2 seconds; run `npm test -- --run` confirm GREEN
- [ ] T018 [US1] Write failing integration tests for `BallotToolClient` in `src/components/BallotToolClient.test.tsx`: entering TX zip and submitting shows StateInfoCard with TX data; PromptOutput appears with TX context in prompt text; loading state (`data-testid` not required but `LookupResult.status === 'loading'` renders a loading indicator with accessible text; confirm RED
- [ ] T019 [US1] Implement `src/components/BallotToolClient.tsx` — `'use client'`; `useState` for zipInput, lookupResult; orchestrates ZipForm → loading indicator → StateInfoCard + PromptOutput; loading indicator renders accessible text (e.g., "Loading...") during lookup; run `npm test -- --run` confirm GREEN
- [ ] T020 [US1] Update `src/app/page.tsx` — import and render `BallotToolClient`; hero section (headline, subtitle, chatbot links); Tips section (static content from BALLOT_PROMPT.md tips); Footer (attribution, share CTA)
- [ ] T021 [US1] Update `src/app/layout.tsx` — add skip-to-content link `<a href="#main-content">Skip to main content</a>` with `sr-only focus:not-sr-only` classes; set `<html lang="en">`; update metadata title/description
- [ ] T022 [US1] Commit: `phase1: US1 core voter flow — ZipForm + StateInfoCard + PromptOutput + BallotToolClient — RED→GREEN`

**Checkpoint**: Enter zip "73301" at http://localhost:3000, confirm TX info appears and prompt copies correctly.

---

## Phase 4: User Story 2 — Multi-State Zip Code Selector (Priority: P2)

**Goal**: Voters with a zip spanning multiple states can choose their state.

**Independent Test**: Enter zip "86515", verify state selector appears with AZ and NM
options; selecting AZ shows Arizona election info.

### Tests — User Story 2

- [ ] T023 [P] [US2] Write failing tests for `StateSelectorModal` in `src/components/StateSelectorModal.test.tsx`: renders `state-selector` data-testid, shows question text, renders a button per state code, clicking a state calls `onSelect(stateCode)`; confirm RED

### Implementation — User Story 2

- [ ] T024 [US2] Implement `src/components/StateSelectorModal.tsx` — renders state selector with question "This zip code spans multiple states. Which state are you voting in?", one button per state, keyboard accessible, `data-testid="state-selector"`; run `npm test -- --run` confirm GREEN
- [ ] T025 [US2] Wire `StateSelectorModal` into `BallotToolClient.tsx` — when `LookupResult.status === 'multi-state'`, show selector; on `onSelect`, resolve to `'found'` state; update integration tests; run `npm test -- --run` confirm GREEN
- [ ] T026 [US2] Commit: `phase1: US2 multi-state selector — StateSelectorModal — RED→GREEN`

**Checkpoint**: Enter zip "86515", verify state selector appears; select AZ, verify AZ info card loads.

---

## Phase 5: User Story 3 — Error and Edge Case States (Priority: P3)

**Goal**: All error conditions show correct, actionable messages.

**Independent Test**: Verify `not-found-message`, `no-election-message`, inline zip errors,
and all-deadlines-passed alert each render with correct text.

### Tests — User Story 3

- [ ] T027 [P] [US3] Write failing tests for error states in `src/components/BallotToolClient.test.tsx` additions: submitting unknown zip shows `not-found-message`; submitting zip for state with no upcoming election shows `no-election-message`; all-deadlines-passed shows alert with `registrationCheckUrl`; confirm RED

### Implementation — User Story 3

- [ ] T028 [US3] Add `not-found-message` element to `BallotToolClient.tsx` — shown when `LookupResult.status === 'not-found'`; text includes link to state election directory; `data-testid="not-found-message"`; run `npm test -- --run` confirm GREEN
- [ ] T029 [US3] Add `no-election-message` element to `BallotToolClient.tsx` — shown when `LookupResult.status === 'no-election'`; text includes state name and link to state election website; `data-testid="no-election-message"`; run `npm test -- --run` confirm GREEN
- [ ] T030 [US3] Add all-deadlines-passed alert inside `StateInfoCard.tsx` — shown when all three registration deadlines have passed; `role="alert"`; includes link to `registrationCheckUrl`; run `npm test -- --run` confirm GREEN
- [ ] T031 [US3] Ensure `getStateData.ts` handles the no-upcoming-election case and returns `LookupResult.status === 'no-election'` from `BallotToolClient`; run `npm test -- --run` confirm GREEN
- [ ] T032 [US3] Commit: `phase1: US3 error states — not-found, no-election, deadlines-passed — RED→GREEN`

**Checkpoint**: Test all error scenarios manually and confirm each shows the correct message.

---

## Phase 6: User Story 4 — Tips and Footer (Priority: P4)

**Goal**: Static tips section and footer render on every page load.

**Independent Test**: Page loads and tips section + footer are visible without any zip input.

### Implementation — User Story 4

**TDD NOTE**: Tips and footer are static but still need tests confirming section presence
and content — write failing tests FIRST per Constitution §IV.

- [ ] T033 [US4] Write failing tests for Tips and Footer in `src/app/page.test.tsx` (or co-located test): tips section renders with at least one tip text item from BALLOT_PROMPT.md and an AI-disclaimer sentence; footer renders attribution text "Created by a human using AI tools"; confirm RED with `npm test -- --run`
- [ ] T034 [US4] Ensure Tips section and Footer are present in `src/app/page.tsx` — if T020 already added them, confirm tests now pass; if missing, add the sections; run `npm test -- --run` confirm GREEN
- [ ] T035 [US4] Commit: `phase1: US4 tips + footer — RED→GREEN`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify all 13 data-testids, accessibility, responsiveness, and measurement gates.

- [ ] T036 [P] Audit all 13 required `data-testid` attributes: `zip-input`, `zip-submit`, `zip-error`, `state-selector`, `state-info`, `prompt-output`, `copy-button`, `copy-confirmation`, `election-name`, `election-date`, `registration-status`, `no-election-message`, `not-found-message` — fix any missing
- [ ] T037 [P] Verify accessibility: skip link present in DOM, all form inputs have `<label>`, `role="alert"` on error messages, `aria-live="polite"` on `copy-confirmation`, `<html lang="en">`, logical heading hierarchy h1 → h2 → h3
- [ ] T038 [P] Verify responsive layout at 375px, 768px, 1280px viewports in browser devtools; confirm no horizontal scroll; confirm prompt output scrollable without losing copy button on mobile
- [ ] T039 Run `npm run build` — fix any TypeScript or build errors
- [ ] T040 Run `npm run lint` — fix all ESLint errors; verify complexity ≤ 10 per function
- [ ] T041 Run `npm test -- --run` — confirm all unit tests GREEN
- [ ] T042 Run `npm run measure` — record Lighthouse scores, Playwright pass rate, ESLint errors; target: Lighthouse ≥ 90, all e2e pass, 0 lint errors
- [ ] T043 Commit: `phase1: polish — all gates pass`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types) — BLOCKS all component work
- **US1 (Phase 3)**: Depends on Foundational — the MVP core
- **US2 (Phase 4)**: Depends on Foundational; integrates into BallotToolClient from US1
- **US3 (Phase 5)**: Depends on US1 BallotToolClient being in place
- **US4 (Phase 6)**: Depends on page.tsx from US1 — layout scaffold
- **Polish (Phase 7)**: Depends on all story phases complete

### Within Each Phase — TDD Order

1. Write test → `npm test -- --run` → confirm RED (never skip)
2. Implement → `npm test -- --run` → confirm GREEN
3. Commit with `phase1: <name> — RED→GREEN`

### Parallel Opportunities

Within Phase 2: T003–T006 can run in parallel (different utility files, independent tests).
Within Phase 3: T012–T014 can run in parallel (different component test files).
Within Phase 7: T036–T038 can run in parallel (different concerns).

---

## Parallel Example: Phase 2 Foundational Tests

```bash
# All four test files can be written simultaneously:
Task T003: "Write failing tests for lookupZip in src/lib/lookupZip.test.ts"
Task T004: "Write failing tests for getStateData in src/lib/getStateData.test.ts"
Task T005: "Write failing tests for getDeadlineStatus in src/lib/getDeadlineStatus.test.ts"
Task T006: "Write failing tests for generatePrompt in src/lib/generatePrompt.test.ts"
# Then confirm all RED, then implement T007–T010 in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational utilities with TDD (T003–T011)
3. Complete Phase 3: US1 full flow (T012–T022)
4. **STOP and VALIDATE**: Enter zip "73301", verify TX info and copy prompt work end-to-end
5. Run `npm test -- --run` and `npm run build` — all green

### Incremental Delivery

1. Phase 1+2 → Utilities tested and working
2. Phase 3 → Core voter flow working (MVP!)
3. Phase 4 → Multi-state zip handling
4. Phase 5 → All error states
5. Phase 6 → Tips and footer
6. Phase 7 → Polish, all measurement gates

---

## Notes

- **[P]** = different files, no blocking dependencies — can dispatch to parallel subagents
- **[US1–US4]** label maps each task to its user story for traceability
- TDD RED step is non-negotiable: `npm test -- --run` MUST report a failure before implementing
- All commits: `phase1: <description> — RED→GREEN` format
- `getDeadlineStatus` always receives `todayISO` as parameter in tests (inject fixed date)
- Multi-state zip 86515 requires AZ and NM stub data (T002)
