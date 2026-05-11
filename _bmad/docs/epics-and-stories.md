# Epics and Stories: Voter Choice

**Sprint:** 1 (all stories)

---

## Epic 1: Data Layer

### Story 1.1: TypeScript Types
Define all TypeScript interfaces for StateData, Election, Registration, EarlyVoting, VotingRules, Resources, ZipLookup, DeadlineStatus enum.

**AC:** Types compile without errors. All fields from PROJECT_SPEC.md data schema are represented.

### Story 1.2: Deadline Utilities
Implement `getDaysRemaining`, `getDeadlineStatus`, `getDeadlineLabel`, `formatDate`, `allDeadlinesPassed` in `src/lib/deadlineUtils.ts`.

**AC:** All functions have unit tests passing. Status thresholds: GREEN >14 days, YELLOW 1-14 days, RED ≤3 days, PASSED <0.

### Story 1.3: State Data Access
Implement `getStateCodesForZip`, `getStateData`, `findNextElection` in `src/lib/stateData.ts`.

**AC:** Returns correct data for TX (73301), CA (90210), NH (03031). Returns empty for unknown zip. Multi-state zip 86515 → [AZ, NM].

### Story 1.4: Prompt Builder
Implement `buildContextBlock` and `buildPrompt` in `src/lib/promptBuilder.ts`.

**AC:** Context block includes all fields per PROJECT_SPEC.md Prompt Customization Logic. Handles null election gracefully.

---

## Epic 2: Zip Code Entry

### Story 2.1: ZipForm Component
Create `ZipForm` with label, input (data-testid="zip-input"), submit button (data-testid="zip-submit"), error display (data-testid="zip-error").

**AC:** Empty submit → "Please enter a zip code". Non-numeric → "Please enter a valid 5-digit zip code". Enter key submits. Touch targets ≥44px.

---

## Epic 3: State Info Display

### Story 3.1: StateSelector Component
Create `StateSelector` with dropdown (data-testid="state-selector") for multi-state zip codes.

**AC:** Shows state names in dropdown. Selecting a state triggers onSelect callback.

### Story 3.2: DeadlineStatus Component
Create `DeadlineStatus` component showing date, relative label, and color-coded status badge.

**AC:** Correct colors per deadline thresholds. Text label always shown alongside color.

### Story 3.3: StateInfo Component
Create `StateInfo` card (data-testid="state-info") with election-name, election-date, registration-status, early voting, voter rules, resources.

**AC:** All sub-testids present. no-election-message shown when no election found. All-deadlines-passed alert shown when applicable.

---

## Epic 4: Prompt + Copy

### Story 4.1: PromptOutput Component
Create `PromptOutput` with prompt-output container, copy-button, copy-confirmation.

**AC:** Copy button copies full prompt to clipboard. Confirmation visible ~2 seconds. Fallback for no clipboard API. Touch targets ≥44px.

---

## Epic 5: Layout, Accessibility, Polish

### Story 5.1: BallotTool Orchestrator
Implement state machine in `BallotTool.tsx` connecting all components.

**AC:** All state transitions correct: idle → loading → result/not-found/multi-state.

### Story 5.2: Page Layout and Accessibility
Implement layout.tsx with skip-to-content link, root HTML lang attribute, metadata. Implement page.tsx with hero section, chatbot links, tips, footer.

**AC:** Skip-to-content link present. Heading hierarchy h1>h2>h3. ARIA labels on all sections. Keyboard navigation works through all interactive elements.
