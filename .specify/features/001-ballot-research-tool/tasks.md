# Tasks: Ballot Research Tool

**Feature ID:** 001
**Generated:** 2026-05-11
**Total Tasks:** 30
**Status:** Ready for Implementation

---

## Phase 1: Setup

- [x] T001 Create TypeScript types in src/types/index.ts (StateData, Election, Registration, EarlyVoting, VotingRules, Resources, LookupResult, DeadlineStatus)
- [x] T002 Extract ballot prompt text from docs/BALLOT_PROMPT.md into src/lib/ballot-prompt.ts as a string constant
- [x] T003 Verify src/data/zip-to-state.json includes TX (73301), CA (90210), NH (03031), multi-state (86515→AZ/NM)
- [x] T004 Verify src/data/states/TX.json, CA.json, NH.json match the StateData schema
- [x] T005 Update package.json build script to "next build --turbo" for Node 22 WasmHash compatibility

---

## Phase 2: Foundational Logic

- [x] T006 [P] Implement src/lib/lookup.ts with zipLookup(zip: string, stateCode?: string): LookupResult
- [x] T007 [P] Implement src/lib/deadline-status.ts with getDeadlineStatus(dateStr: string, today: Date): DeadlineStatus
- [x] T008 Implement src/lib/prompt-builder.ts with buildPrompt(stateData: StateData, zipCode: string, election: Election): string

---

## Phase 3: User Story 1 — Zip Code Lookup and State Info Display

- [x] T009 [US1] Implement src/components/ZipCodeForm.tsx with data-testid="zip-input", "zip-submit", "zip-error"; handles empty, non-numeric, wrong-length errors
- [x] T010 [P] [US1] Implement src/components/NotFoundMessage.tsx with data-testid="not-found-message"
- [x] T011 [P] [US1] Implement src/components/NoElectionMessage.tsx with data-testid="no-election-message"
- [x] T012 [US1] Implement src/components/StateSelector.tsx with data-testid="state-selector"; displays when zip maps to multiple states
- [x] T013 [US1] Implement src/components/RegistrationStatus.tsx with data-testid="registration-status"; shows color+text indicators (green/yellow/red/passed) for each deadline
- [x] T014 [US1] Implement src/components/StateInfo.tsx with data-testid="state-info", "election-name", "election-date"; includes RegistrationStatus, early voting, voter ID rules, resource links

---

## Phase 4: User Story 2 — Customized Prompt Generation and Copy

- [x] T015 [US2] Implement src/components/PromptOutput.tsx with data-testid="prompt-output", "copy-button", "copy-confirmation"; clipboard API + fallback; "Copied!" confirmation for 2s

---

## Phase 5: Page Assembly and Accessibility

- [x] T016 Rewrite src/app/page.tsx as BallotResearchTool: hero section, ZipCodeForm, conditional display of StateSelector/NotFoundMessage/NoElectionMessage/StateInfo/PromptOutput, tips section, footer
- [x] T017 Update src/app/layout.tsx: add skip-to-content link, set page title "Voter Choice — Free AI Ballot Research Tool", add meta description
- [x] T018 Verify heading hierarchy: h1 in hero, h2 for major sections (State Info, Tips), h3 for sub-sections
- [x] T019 Add aria-live="polite" on zip-error for screen reader announcements; verify all form inputs have <label> elements
- [x] T020 Verify minimum 44px tap targets on all interactive elements via Tailwind min-h-[44px] min-w-[44px]
- [x] T021 Verify prompt output container is scrollable on mobile (overflow-y-auto + max-h-[60vh] or similar) while copy button stays fixed/accessible

---

## Phase 6: Polish and Verification

- [x] T022 Run npm run lint and fix any ESLint errors
- [x] T023 Run npx vitest run and verify tests pass (or add missing unit tests for lookup.ts, deadline-status.ts, prompt-builder.ts)
- [x] T024 Run npx playwright test and fix any failing e2e tests
- [x] T025 Verify all 13 required data-testid attributes are present and on the correct elements
- [x] T026 Verify no localStorage/sessionStorage/cookie usage exists (grep check)
- [x] T027 Verify no dangerouslySetInnerHTML usage exists (grep check)
- [x] T028 [P] Commit phase1: spec-kit replicate r2 (setup, types, logic, components, page)
- [x] T029 [P] Verify build succeeds: npm run build
- [x] T030 Final lint + test pass verification

---

## Dependencies

```
T001 → T006, T007, T008, T009, T012, T013, T014, T015
T002 → T008
T003, T004 → T006
T006 → T009, T012, T016
T007 → T013
T008 → T015
T009, T010, T011, T012, T013, T014, T015 → T016
T016, T017 → T018, T019, T020, T021
T018-T021 → T022, T023, T024
T022-T027 → T028, T029
```

## Parallel Execution Opportunities

- T006 and T007 can run in parallel (different files, no shared dependency)
- T010 and T011 can run in parallel (independent components)
- T028 and T029 can run in parallel after T027

## Implementation Strategy

**MVP (Phase 1-3):** Setup types + logic + zip form + state info display = validates US1
**Increment 2 (Phase 4):** Add prompt output = validates US2
**Increment 3 (Phase 5-6):** Accessibility + verification = complete acceptance
