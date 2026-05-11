---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ["_bmad-output/planning-artifacts/prd-voter-choice-2026-05-11.md", "_bmad-output/planning-artifacts/architecture-voter-choice-2026-05-11.md"]
date: "2026-05-11"
sprint: 1
---

# Epics and Stories: Voter Choice Ballot Research Tool

## Sprint 1 (All stories — single sprint build)

---

## Epic 1: Project Scaffold and Data Layer

**Goal**: Set up the Next.js project with TypeScript, Tailwind, and static data files.

### Story 1.1: Data layer and type definitions
- Set up `src/lib/types.ts` with StateElectionData interface
- Create `src/lib/lookupState.ts` — pure function, zip → state code(s)
- Create `src/lib/deadlineStatus.ts` — date arithmetic, returns status + days remaining
- Create `src/lib/generatePrompt.ts` — injects state data into prompt template
- Unit tests for all three lib functions

**Acceptance Criteria**:
- `lookupState("73301")` returns `["TX"]`
- `lookupState("86515")` returns `["AZ", "NM"]`
- `lookupState("00000")` returns `[]`
- `deadlineStatus` returns "passed" for dates before today, correct status for future dates
- `generatePrompt` output contains state name, election name, zip code

---

## Epic 2: Zip Code Entry and Validation

**Goal**: Implement the zip code input form with full validation and error states.

### Story 2.1: Zip code form component
- `ZipCodeForm` component with `data-testid="zip-input"` and `data-testid="zip-submit"`
- Validates: empty → "Please enter a zip code"
- Validates: non-numeric or wrong length → "Please enter a valid 5-digit zip code"
- Error shown in `data-testid="zip-error"` container with `role="alert"`
- Submits on button click and Enter key
- Calls `onSubmit(zip)` prop on valid submission

**Acceptance Criteria**:
- All validation states tested and working
- Enter key submits form
- Error uses `role="alert"` for screen reader announcement

---

## Epic 3: State Info Display

**Goal**: Show election info card after valid zip submission.

### Story 3.1: StateInfoCard component
- Displays in `data-testid="state-info"`
- Shows state name (e.g., "Texas")
- Shows election name in `data-testid="election-name"`
- Shows election date in `data-testid="election-date"`
- Shows registration status in `data-testid="registration-status"` with color indicators
- Shows early voting dates, voter ID rules, phone-at-polls policy
- Shows links to county election office and sample ballot
- When no upcoming election: `data-testid="no-election-message"`

**Acceptance Criteria**:
- Texas zip (73301) shows "Texas" and "2026 Texas Primary Runoff" (next upcoming after today 2026-05-11)
- Registration deadlines show correct color + text label
- No localStorage usage

### Story 3.2: Multi-state selector
- For multi-state zip (86515): show `data-testid="state-selector"`
- Selector shows state options (AZ, NM)
- Selecting a state triggers state info display

**Acceptance Criteria**:
- 86515 shows state selector
- Selecting a state shows that state's info

---

## Epic 4: Prompt Generation and Copy

**Goal**: Generate and display the customized AI prompt with copy functionality.

### Story 4.1: PromptOutput component
- Displays in `data-testid="prompt-output"` (always visible after valid zip)
- Shows base ballot prompt + state-specific context block
- Context block includes: election name/date/type, deadlines, early voting, ID rules, phone policy, sample ballot link, county election link

### Story 4.2: Copy to clipboard
- `data-testid="copy-button"` visible after valid zip
- Clicking copies full prompt text
- `data-testid="copy-confirmation"` shown for ~2 seconds after copy
- Fallback for browsers without Clipboard API

**Acceptance Criteria**:
- Copy confirmation appears and disappears
- Prompt contains "Texas", "73301" for Texas zip
- Prompt contains election-specific data

---

## Epic 5: Accessibility and Layout

**Goal**: Ensure the app meets WCAG AA and renders correctly at all breakpoints.

### Story 5.1: Accessibility fundamentals
- Skip-to-content link at top of page
- All form inputs have associated `<label>` elements
- Focus indicators visible on all interactive elements
- Logical heading hierarchy: h1 (page title) > h2 (sections) > h3 (subsections)
- ARIA labels on copy button and state selector

### Story 5.2: Responsive layout
- Mobile-first Tailwind layout
- Renders correctly at 375px, 768px, 1280px
- All touch targets ≥ 44x44px on mobile
- Prompt output scrollable on mobile without losing copy button

### Story 5.3: Page metadata and SEO
- Update `layout.tsx` metadata: title "Voter Choice — Ballot Research Tool"
- Appropriate meta description
- Remove default Next.js scaffold content from page.tsx

---

## Story Execution Order

1. Story 1.1 (data layer) — foundation for all other stories
2. Story 2.1 (zip form) — entry point
3. Story 3.1 (state info) — requires data layer
4. Story 3.2 (multi-state) — requires state info
5. Story 4.1 (prompt output) — requires state info + generatePrompt
6. Story 4.2 (copy) — requires prompt output
7. Story 5.1-5.3 (accessibility + layout) — final polish pass
