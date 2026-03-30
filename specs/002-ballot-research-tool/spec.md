# Feature Specification: Ballot Research Tool

**Feature Branch**: `002-ballot-research-tool`
**Created**: 2026-03-30
**Status**: Draft
**Input**: Build the ballot research tool per docs/PROJECT_SPEC.md

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Voter Gets a Customized AI Prompt (Priority: P1)

A U.S. voter visits the page, enters their 5-digit zip code, sees their state's election
information, and copies a customized AI ballot research prompt to paste into any free AI
chatbot (Claude, ChatGPT, Gemini, Grok).

**Why this priority**: This is the entire purpose of the tool. Every other feature
supports this core journey.

**Independent Test**: Can be fully tested by entering a known zip code (e.g., 73301 for
TX), verifying state info appears, and verifying the prompt contains state-specific data.
Delivers the complete value proposition independently.

**Acceptance Scenarios**:

1. **Given** the page is loaded, **When** a user enters zip code "73301" and submits,
   **Then** the Texas election info card appears with the correct election name, date,
   registration deadlines, early voting dates, voter ID requirements, and resource links.

2. **Given** the Texas election info card is visible, **When** the user clicks "Copy to
   Clipboard", **Then** the full prompt text plus the pre-filled Texas context block is
   copied and the button shows "Copied!" for approximately 2 seconds.

3. **Given** the page is loaded, **When** a user enters zip code "90210" and submits,
   **Then** the California election info card appears with correct CA-specific data.

4. **Given** the page is loaded, **When** a user enters zip code "03301" (NH) and submits,
   **Then** the New Hampshire election info card appears with correct NH-specific data.

---

### User Story 2 — Voter with Multi-State Zip Code Selects State (Priority: P2)

A voter whose zip code spans multiple states (e.g., 86515 for AZ/NM) is presented with
a state selector to choose which state they are voting in.

**Why this priority**: Without this, some users get incorrect data or no data at all.
Essential for accuracy and coverage.

**Independent Test**: Entering zip 86515 shows a state selector; choosing AZ or NM shows
the correct state's info. Testable in isolation.

**Acceptance Scenarios**:

1. **Given** the page is loaded, **When** a user enters zip code "86515" (spans AZ/NM)
   and submits, **Then** a state selector appears asking "Which state are you voting in?"
   with AZ and NM as options.

2. **Given** the state selector is visible, **When** the user selects "AZ", **Then** the
   Arizona election info card appears and the prompt is pre-filled with Arizona data.

---

### User Story 3 — Voter Encounters Error or Edge Case States (Priority: P3)

A voter enters an invalid zip code, an unknown zip code, or encounters a state with no
upcoming elections. Clear, actionable messages guide them forward.

**Why this priority**: Error handling determines whether frustrated users bounce or find
another path. Secondary to the happy path but important for real usage.

**Independent Test**: Each error condition can be triggered and the correct message
verified independently.

**Acceptance Scenarios**:

1. **Given** the zip input is empty, **When** the user submits, **Then** the error message
   "Please enter a zip code" is displayed inline.

2. **Given** a non-numeric or wrong-length value is entered, **When** the user submits,
   **Then** the message "Please enter a valid 5-digit zip code" is displayed inline.

3. **Given** an unknown zip code (e.g., "00001") is entered, **When** the user submits,
   **Then** the not-found message is displayed with a link to the state election website
   directory.

4. **Given** all registration deadlines for the state have passed, **When** the state info
   card loads, **Then** an alert shows with a link to check registration status.

5. **Given** no upcoming election is found for the state, **When** the state info card
   would load, **Then** the no-election message is displayed with a link to the state
   election website.

---

### User Story 4 — Voter Reads Usage Tips (Priority: P4)

A voter scrolling the page reads static tips for using the AI ballot research prompt
effectively, including a reminder to verify information with official sources.

**Why this priority**: Provides context and builds trust. Entirely static; low risk.

**Independent Test**: The tips section is always visible on the page; its content can be
verified in isolation without any interaction.

**Acceptance Scenarios**:

1. **Given** any page load, **When** the user scrolls to the tips section, **Then** tips
   for using the prompt effectively are displayed along with a reminder that AI can make
   mistakes.

---

### Edge Cases

- What happens when a zip code spans more than 2 states? Show state selector with all
  matching states listed.
- How does the system handle a state with no earlyVoting data? Display "Not available —
  absentee voting only".
- What if a registration deadline is exactly today? Display "Today (last day)" in red —
  today is the last eligible day, not passed. "Passed" means `date < today` (strictly
  before today).
- What if the clipboard API is unavailable? Select all text in the prompt area and show
  "Press Ctrl+C / Cmd+C to copy".
- What if no upcoming election has a date ≥ today? Show the no-election message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single-page interface with: hero section, zip code
  entry form, state info display (shown after valid submission), prompt output, tips
  section, and footer — in that visual order.

- **FR-002**: The zip code input MUST accept only 5-digit numeric values; non-numeric or
  wrong-length input MUST display an inline validation error before the state lookup runs.
  Exact error messages: empty input → "Please enter a zip code"; non-numeric or wrong
  length → "Please enter a valid 5-digit zip code"; zip not in dataset →
  "We don't have data for this zip code yet. We're working on adding all U.S. zip codes."
  with a link to the state election website directory.

- **FR-002b**: While the zip lookup result is being resolved (even for near-instant static
  lookup), the system MUST display a brief loading indicator to prevent layout shift. The
  loading indicator MUST be accessible (not purely visual).

- **FR-003**: On valid zip code submission, the system MUST look up the associated state(s)
  from static data and display the matching state's election information.

- **FR-004**: The state info display MUST include: state name, next upcoming election name
  and date, voter registration deadlines (online/by mail/in person) with status
  indicators, early voting dates (or absence notice), a link to the county election
  office, a link to the sample ballot lookup, voter ID requirements, and phone-at-polls
  policy.

- **FR-005**: Deadline status indicators MUST show both the deadline date and a relative
  text label using these exact thresholds:
  - `daysLeft > 14` → green, label: "{N} days left"
  - `4 ≤ daysLeft ≤ 14` → yellow, label: "{N} days left"
  - `1 ≤ daysLeft ≤ 3` → red, label: "{N} days left"
  - `daysLeft === 0` → red, label: "Today (last day)"
  - `daysLeft < 0` (past deadline) → gray, label: "Passed"
  Color MUST NOT be the sole indicator — text label is always required.
  When `registration.online.available === false`, the online deadline MUST be excluded from
  the all-deadlines-passed alert calculation (only byMail and inPerson deadlines count).

- **FR-006**: System MUST generate a customized AI prompt by combining the base ballot
  research prompt text with a pre-filled context block containing: election name/date/type,
  all registration deadlines, early voting info, voter ID info, phone policy, sample
  ballot link, and county election office link.

- **FR-007**: A "Copy to Clipboard" button MUST copy the full prompt plus context block as
  plain text.

- **FR-008**: After a successful copy, the button MUST show "Copied!" with a visual
  indicator for exactly 2 seconds, then revert to "Copy to Clipboard".

- **FR-009**: If the clipboard API is unavailable, the system MUST fall back to selecting
  all text in the prompt area and displaying "Press Ctrl+C / Cmd+C to copy".

- **FR-010**: When a submitted zip code maps to multiple states, the system MUST display a
  state selector before showing election info.

- **FR-011**: All 13 required data-testid attributes MUST be present on the correct
  elements: zip-input, zip-submit, zip-error, state-selector, state-info, prompt-output,
  copy-button, copy-confirmation, election-name, election-date, registration-status,
  no-election-message, not-found-message.

- **FR-012**: The tool MUST NOT host or run an LLM, store user data, make external API
  calls, or require any backend server at runtime. All data is static.

- **FR-013**: All interactive elements MUST be keyboard-navigable, have visible focus
  indicators, and meet WCAG AA color contrast standards. Error messages MUST be announced
  to screen readers. A skip-to-content link MUST be present.

- **FR-014**: Layout MUST be mobile-first and render correctly at 375px (mobile), 768px
  (tablet), and 1280px (desktop) viewport widths. All interactive elements MUST have
  minimum 44×44 px touch targets on mobile.

### Key Entities

- **ZipToStateMapping**: Static lookup from 5-digit zip code strings to arrays of 2-letter
  state abbreviations. One zip may map to one or multiple states.

- **StateElectionData**: Per-state static record with: state code/name, elections list
  (id, name, date, type, primaryType), registration deadlines (online/byMail/inPerson with
  dates and URLs), early voting window (startDate, endDate, notes), voting rules
  (idRequired, acceptedIds, phonesAtPolls), and resource links.

- **CustomizedPrompt**: Generated text = base AI prompt + pre-filled context block with
  state-specific election data. Produced deterministically from StateElectionData and
  today's date.

- **DeadlineStatus**: Derived value per registration deadline: green (> 14 days), yellow
  (4–14 days), red (1–3 days or today), gray/passed (date < today). When
  `registration.online.available === false`, online deadline is excluded from the
  all-passed calculation. Calculated at render time from today's browser date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 13 required data-testid attributes are present on the correct elements;
  the shared Playwright e2e test suite passes 100% (all tests green).

- **SC-002**: All unit tests for data utilities (zip lookup, state data retrieval, deadline
  status calculation, prompt generation) pass 100%.

- **SC-003**: Page achieves Lighthouse scores ≥ 90 for Performance, Accessibility, Best
  Practices, and SEO.

- **SC-004**: Deadline status calculations produce the correct label and status class for
  all threshold boundaries (> 14 days, ≤ 14 days, ≤ 3 days, passed), verified by unit
  tests using fixed reference dates.

- **SC-005**: The prompt output contains the complete base prompt plus a correctly
  populated context block for TX, CA, and NH stub data — verified by e2e and unit tests.

- **SC-006**: All interactive elements are keyboard-navigable: tab order matches visual
  flow, Enter/Space activate buttons, and no keyboard traps exist — verified manually and
  by Playwright accessibility assertions.

- **SC-007**: Layout renders without horizontal scroll or clipped content at 375px, 768px,
  and 1280px viewport widths.

- **SC-008**: A complete flow (enter zip → view state info → copy prompt) is achievable
  without a mouse, using only keyboard navigation.

## Assumptions

- The base AI ballot research prompt text is loaded from docs/BALLOT_PROMPT.md at build
  time and does not change at runtime.
- Stub data for TX, CA, and NH is sufficient for all test scenarios; full 50-state data is
  out of scope.
- "Today's date" for deadline calculations is the browser's local date at render time; no
  server-side date injection is required.
- All zip-to-state and state election JSON files are bundled as static assets with no
  external fetch needed.
- The tool is English-only for Phase 1; Spanish support is Phase 2.
- No analytics, authentication, or deployment configuration is in scope.
- Stub data for AZ and NM is required for the multi-state zip test (zip 86515 → AZ/NM).
  These stubs contain minimal data sufficient for the state selector to function.
- The term "StateInfoCard" is the canonical name for the state election info display
  component throughout all artifacts (formerly "state info display" or "state info card"
  in some spec sections).
