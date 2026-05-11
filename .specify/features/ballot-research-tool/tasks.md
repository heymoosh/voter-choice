# Tasks: Ballot Research Tool

**Feature**: ballot-research-tool
**Created**: 2026-05-11
**Total Tasks**: 28
**Source Plan**: plan.md

---

## Phase 1: Setup

- [x] T001 Create TypeScript interfaces for state data in src/types/election.ts
- [x] T002 Extract ballot prompt text constant to src/lib/ballotPrompt.ts from docs/BALLOT_PROMPT.md
- [x] T003 Update metadata in src/app/layout.tsx (title: "Voter Choice — Ballot Research Tool")

## Phase 2: Foundational

- [x] T004 Implement lookupState(zip) in src/lib/zipLookup.ts — returns state code array or null
- [x] T005 Implement findNextElection(elections) in src/lib/electionUtils.ts — returns first election >= today
- [x] T006 Implement getDeadlineStatus(deadline) in src/lib/electionUtils.ts — returns status and label
- [x] T007 Implement buildPrompt(stateData, zip) in src/lib/promptBuilder.ts — returns full prompt + context block
- [x] T008 [P] Write unit tests for zipLookup.ts in src/lib/**tests**/zipLookup.test.ts
- [x] T009 [P] Write unit tests for electionUtils.ts in src/lib/**tests**/electionUtils.test.ts
- [x] T010 [P] Write unit tests for promptBuilder.ts in src/lib/**tests**/promptBuilder.test.ts

## Phase 3: User Story 1 — Zip Input & State Info Display

**Story goal**: User enters zip code, sees state election information
**Independent test**: State info card renders with correct election data for TX (73301) and CA (90210)

- [x] T011 [US1] Create ZipForm component in src/components/ZipForm.tsx with data-testid="zip-input", "zip-submit", "zip-error"
- [x] T012 [US1] Create StateSelector component in src/components/StateSelector.tsx with data-testid="state-selector"
- [x] T013 [US1] Create StateInfoCard component in src/components/StateInfoCard.tsx with data-testids: "state-info", "election-name", "election-date", "registration-status", "no-election-message"
- [x] T014 [US1] Create BallotTool main client component in src/components/BallotTool.tsx (orchestrates ZipForm, StateSelector, StateInfoCard, PromptOutput)

## Phase 4: User Story 2 — Prompt Generation & Copy

**Story goal**: User receives customized prompt and can copy it to clipboard
**Independent test**: Prompt output contains "Texas" and "73301" for TX zip; copy button shows confirmation

- [x] T015 [US2] Create PromptOutput component in src/components/PromptOutput.tsx with data-testids: "prompt-output", "copy-button", "copy-confirmation"
- [x] T016 [US2] Integrate PromptOutput into BallotTool.tsx — show after state info

## Phase 5: User Story 3 — Static Content Sections

**Story goal**: Page includes hero section, tips, and footer
**Independent test**: Page loads with all sections visible

- [x] T017 [US3] Update src/app/page.tsx to render BallotTool with hero section header
- [x] T018 [US3] Create TipsSection component in src/components/TipsSection.tsx
- [x] T019 [US3] Create Footer component in src/components/Footer.tsx with share CTA and attribution

## Phase 6: Polish & Cross-Cutting

- [x] T020 Add skip-to-content link in src/app/layout.tsx for keyboard accessibility
- [x] T021 Verify all interactive elements have minimum 44px touch targets in Tailwind classes
- [x] T022 Add data-testid="not-found-message" to BallotTool for unknown zip codes
- [x] T023 Add loading state visual indicator (brief spinner/shimmer on zip submit)
- [x] T024 Verify keyboard Enter submits form in ZipForm.tsx
- [x] T025 Verify color contrast meets WCAG AA in Tailwind color choices
- [x] T026 Add ARIA roles and labels to PromptOutput and StateInfoCard
- [x] T027 Final integration: ensure BallotTool wires all sub-components correctly
- [x] T028 Run npm run build to verify no build errors (with --turbo flag)

---

## Dependencies

- T004-T007 depend on T001 (types)
- T008-T010 depend on T004-T007 (testing implementations)
- T011-T014 depend on T004-T007 (use utility functions)
- T015-T016 depend on T007 (promptBuilder)
- T017-T019 depend on T014 (BallotTool exists)
- T020-T028 depend on T014-T019

## Parallel Opportunities

- T008, T009, T010 can run in parallel (separate test files)
- T011, T012 can run in parallel (separate components, no cross-dependency)
- T018, T019 can run in parallel (separate components)
