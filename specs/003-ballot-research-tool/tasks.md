# Tasks: Ballot Research Tool

**Input**: Design documents from `/specs/003-ballot-research-tool/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: Clean environment and verify scaffold is ready

- [ ] T001 Delete build artifacts and reinstall: `rm -rf node_modules .next coverage && npm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript interfaces and library functions that all user stories share. Must complete before any UI work.

**⚠️ CRITICAL**: No user story phases can begin until this phase is complete.

- [ ] T002 Create TypeScript interfaces in `src/types/election.ts`: `ZipLookupResult` (single/multi/not-found/invalid union), `Election`, `RegistrationInfo`, `EarlyVoting`, `VotingRules`, `StateElectionData`, `DeadlineStatus`, `ZipToStateMap` — types must exactly match the JSON schema of existing state data files in `src/data/states/`
- [ ] T003 [P] Create `src/lib/election-data.ts` with three exported functions: (1) `validateZip(zip: string): boolean` — returns true only for 5-digit numeric strings matching `/^\d{5}$/`; (2) `lookupZip(zip: string): ZipLookupResult` — loads `src/data/zip-to-state.json` and returns single/multi/not-found/invalid result; (3) `getStateData(stateCode: string): StateElectionData | null` — dynamically imports the matching `src/data/states/<CODE>.json` file, returns null if file not found; (4) `getNextElection(elections: Election[], today: string): Election` — returns earliest future election, fallback to most recent if all past
- [ ] T004 [P] Create `src/lib/prompt-generator.ts` with one exported function: `generatePrompt(state: StateElectionData, zip: string): string` — returns a multi-paragraph customized AI research prompt string pre-filled with: the voter's zip code, state name, next election name and date, primary type (if applicable), registration deadline and same-day registration status, early voting window (or "not available"), photo ID requirement with accepted IDs list, phone policy at polls, and resource links for polling place lookup and state election website. Prompt must contain the text "Texas"/"California"/etc (the state name) and the zip code verbatim so the Playwright e2e test `prompt-output` assertions pass.

**Checkpoint**: Foundation ready — all user story phases can now begin.

---

## Phase 3: User Story 1 — Single-State Zip Lookup and Prompt Generation (Priority: P1) 🎯 MVP

**Goal**: Voter enters zip code → sees state election info → copies customized AI research prompt.

**Independent Test**: Enter zip `73301` → state-info card shows "Texas" → prompt-output shows "Texas" and "73301" → copy-button click shows "Copied!" for 2 seconds. Enter `abcde` → zip-error visible. Enter `00000` → not-found-message visible.

- [ ] T005 [P] [US1] Create `src/__tests__/election-data.test.ts` with Vitest unit tests covering: `validateZip` accepts "73301", rejects "123", "abcde", ""; `lookupZip("73301")` returns `{status:"single",stateCode:"TX"}`; `lookupZip("00000")` returns `{status:"not-found"}`; `lookupZip("abc")` returns `{status:"invalid"}`; `getStateData("TX")` returns object with `stateName:"Texas"`; `getNextElection` returns correct election given today=2026-05-10
- [ ] T006 [P] [US1] Create `src/__tests__/prompt-generator.test.ts` with Vitest unit tests covering: generated prompt for TX data contains "Texas", contains "73301", contains "registration", contains "election"; prompt for CA data contains "California"; generated prompt has no placeholder text like "N/A" or "undefined"
- [ ] T007 [US1] Replace `src/app/page.tsx` with the ballot research tool main page. The page must: (a) render a skip-to-main-content anchor (href="#main-content") above everything; (b) render `<main id="main-content">`; (c) contain a zip code `<form>` with `<label htmlFor="zip-input">` + `<input data-testid="zip-input" type="text" inputMode="numeric" maxLength={5}>` + `<button data-testid="zip-submit" type="submit">`; (d) show `<p data-testid="zip-error" role="alert">` containing the text "5-digit zip code" when input is empty or non-numeric, `<div data-testid="not-found-message">` when zip is valid but not found; (e) when a single state is resolved, show `<section data-testid="state-info">` containing `<span data-testid="election-name">`, `<span data-testid="election-date">`, and `<div data-testid="registration-status">`; (f) show `<textarea data-testid="prompt-output" readOnly>` with the generated prompt; (g) show `<button data-testid="copy-button">` that calls `navigator.clipboard.writeText()` on click; (h) show `<span data-testid="copy-confirmation">` with "Copied!" text for 2 seconds after successful copy, then hide it; (i) on new zip submission, clear all prior state (error, state-info, prompt-output); (j) support Enter key submission (form onSubmit handler). Use React `useState` for all state. Use Tailwind CSS for styling.
- [ ] T008 [US1] Update `src/app/layout.tsx` to add a skip-to-content link as the very first element in `<body>`: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`. Verify `<html lang="en">` is set.

**Checkpoint**: Enter `73301` → prompt visible with "Texas". Enter `abcde` → zip-error visible. e2e tests T001–T022 should pass.

---

## Phase 4: User Story 2 — Multi-State Zip Disambiguation (Priority: P2)

**Goal**: Zip code that maps to multiple states shows state selector before proceeding.

**Independent Test**: Enter `86515` → `data-testid="state-selector"` is visible with AZ and NM options → selecting one state shows that state's info as if it were a single-state lookup.

- [ ] T009 [US2] Add multi-state handling to `src/app/page.tsx`: when `lookupZip` returns `{status:"multi", stateCodes:["AZ","NM"]}`, render `<div data-testid="state-selector">` containing one button per state code (display the full state name if available from a small lookup map, otherwise show the code). On button click, call `getStateData(selectedCode)` and proceed to show state-info + prompt exactly as in US1. While in multi state selection, do NOT show state-info or prompt-output. Map of state codes to names needed: at minimum AZ→"Arizona", NM→"New Mexico" (add TX, CA, NH too for completeness).

**Checkpoint**: Enter `86515` → state-selector appears → select "Arizona" or "New Mexico" → correct state info shown.

---

## Phase 5: User Story 3 — Accessible and Keyboard-Navigable Interface (Priority: P3)

**Goal**: All elements reachable by keyboard; status changes announced to screen readers; deadline urgency communicated via text + color, not color alone.

**Independent Test**: Tab through page — all interactive elements reach visible focus. After entering `73301` + submit, the state-info region updates with visible content (aria-live region). Registration status shows both a color badge AND a text label like "Closes soon", "Coming up", "Open", or "Closed".

- [ ] T010 [US3] Add `aria-live="polite"` wrapper in `src/app/page.tsx` around the state-info section and prompt output so screen readers announce when new content loads after zip submission. Add `role="alert"` to error and not-found messages (already required by FR-008; verify it's present).
- [ ] T011 [US3] Add visible focus indicator styles to `src/app/globals.css`: `:focus-visible` outline of at least 2px on all interactive elements (buttons, inputs, links). Ensure minimum tap target size of 44×44px for `zip-submit`, `copy-button`, and all state-selector buttons using Tailwind `min-h-[44px] min-w-[44px]`.
- [ ] T012 [US3] Add deadline urgency display inside `data-testid="registration-status"` in `src/app/page.tsx`: compute `DeadlineStatus` from days remaining using thresholds from research.md (≤7 urgent/red, 8–30 approaching/yellow, >30 on-track/green, past closed/gray). Render a colored badge AND a text label ("Closes soon" / "Coming up" / "Open" / "Closed") so colorblind users get full information. The text label must always be visible alongside the color cue.

**Checkpoint**: All three US1/US2/US3 user stories independently functional. Full Playwright e2e suite should achieve ≥95% pass rate.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 Run `npm run build` from repo root and fix any TypeScript or Next.js build errors until it exits 0
- [ ] T014 Run `npm run lint` and fix all ESLint errors. Note: ESLint complexity warning for Home component (max 10) is expected for a single-page app with multiple conditional states — suppress with `// eslint-disable-next-line complexity` if needed at the function definition only
- [ ] T015 [P] Verify all 12 required `data-testid` attributes are present in `src/app/page.tsx`: `zip-input`, `zip-submit`, `zip-error`, `not-found-message`, `state-info`, `election-name`, `election-date`, `registration-status`, `prompt-output`, `state-selector`, `copy-button`, `copy-confirmation` — grep for each and confirm presence

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — T005 and T006 can run in parallel; T007 and T008 can run after T002–T004
- **Phase 4 (US2)**: Depends on Phase 3 checkpoint — adds to page.tsx built in T007
- **Phase 5 (US3)**: Depends on Phase 3 checkpoint — enhances page.tsx and globals.css
- **Phase 6 (Polish)**: Depends on all story phases

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on US2/US3
- **US2 (P2)**: Depends on US1 page.tsx being functional (T007) — adds multi-state branch
- **US3 (P3)**: Depends on US1 page.tsx being functional (T007) — adds accessibility enhancements

### Within Each User Story

- Tests (T005, T006) and foundational modules (T003, T004) can run in parallel [P]
- Page implementation (T007) must follow T002–T004

### Parallel Opportunities

```bash
# Phase 2: both lib files can be written simultaneously
T003: src/lib/election-data.ts
T004: src/lib/prompt-generator.ts

# Phase 3: unit tests can be written simultaneously (different files)
T005: src/__tests__/election-data.test.ts
T006: src/__tests__/prompt-generator.test.ts
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: US1 (T005–T008)
4. **STOP and VALIDATE**: `npm run build` + e2e tests for zip input/state-info/prompt flow
5. Proceed to US2/US3 only after US1 is green

### Incremental Delivery

1. Foundation → US1 → validate (MVP shipped!)
2. US1 + US2 → multi-state works
3. US1 + US2 + US3 → fully accessible
4. Polish → clean build, lint, all testids verified

---

## Notes

- No new npm dependencies: all needed packages are already in package.json
- `src/data/states/` only has TX, CA, NH — `getStateData("AZ")` and `getStateData("NM")` will return null; state-selector for 86515 should still show buttons but clicking AZ/NM will show a "not yet supported" message (graceful fallback)
- The shared e2e test for multi-state (86515) only checks that `state-selector` is visible — it does NOT click through to a state, so the AZ/NM not-supported fallback is fine for the e2e gate
- Commit after each completed phase with message format: `spec-kit run5: T00X <description>`
