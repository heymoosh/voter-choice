# Feature Specification: Ballot Research Tool

**Feature Branch**: `001-ballot-tool`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Build ballot research tool per PROJECT_SPEC.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Zip Code Lookup and Prompt Generation (Priority: P1)

A voter enters their zip code and receives a customized AI research prompt with their state-specific election information pre-filled.

**Why this priority**: This is the core value proposition - transforming a generic prompt into a personalized one. Without this, the tool has no purpose.

**Independent Test**: Can be fully tested by entering any valid zip code from stub data and verifying the customized prompt contains correct state name, election date, and registration deadlines. Delivers immediate value even without additional features.

**Acceptance Scenarios**:

1. **Given** a voter visits the homepage, **When** they enter a valid 5-digit zip code and submit, **Then** the system displays their state's election information and a customized prompt with state-specific dates and links pre-filled
2. **Given** a voter has received their customized prompt, **When** they click the "Copy to Clipboard" button, **Then** the full prompt including pre-filled context is copied and a confirmation message appears
3. **Given** a voter enters their zip code, **When** the system displays registration deadlines, **Then** each deadline shows both the date and a status indicator (days remaining or "passed")

---

### User Story 2 - Error Handling and Edge Cases (Priority: P2)

A voter encounters clear, helpful guidance when their zip code is invalid, not in the dataset, or spans multiple states.

**Why this priority**: Real-world usage will hit these edge cases frequently. Without proper handling, users get stuck and abandon the tool.

**Independent Test**: Can be tested by entering various invalid inputs (empty, non-numeric, wrong length, multi-state zip, zip not in dataset) and verifying appropriate error messages appear with actionable guidance.

**Acceptance Scenarios**:

1. **Given** a voter submits an empty zip code field, **When** they click submit, **Then** an inline validation message appears: "Please enter a zip code"
2. **Given** a voter enters a zip code not in the dataset, **When** they submit, **Then** a message appears explaining the zip is not yet supported with a link to state election websites
3. **Given** a voter enters a multi-state zip code, **When** they submit, **Then** a state selector appears asking "Which state are you voting in?" with all applicable states listed
4. **Given** all registration deadlines have passed for an election, **When** a voter views their state info, **Then** an alert appears directing them to check their registration status with a provided link

---

### User Story 3 - Mobile-Friendly Responsive Experience (Priority: P2)

A voter using a mobile device can easily enter their zip code, read election info, and copy the prompt without usability issues.

**Why this priority**: The original prompt went viral on Reddit where most users are on mobile devices. Mobile usability is critical for reach.

**Independent Test**: Can be tested by viewing the tool on mobile viewport (375px width) and verifying all content is readable, all interactive elements are touch-friendly (44x44px minimum), and the prompt is scrollable without losing the copy button.

**Acceptance Scenarios**:

1. **Given** a voter on a mobile device (< 640px width) visits the site, **When** they view any section, **Then** all text is readable without horizontal scrolling and all buttons are easily tappable
2. **Given** a voter on mobile has generated their prompt, **When** the prompt output is displayed, **Then** the text area is scrollable and the copy button remains visible and accessible
3. **Given** a voter on any device, **When** they interact with any button or input, **Then** the tap target is at least 44x44 pixels

---

### User Story 4 - Accessible Experience for All Voters (Priority: P3)

A voter using keyboard navigation or a screen reader can independently complete the full workflow without assistance.

**Why this priority**: This is a civic tool serving all voters including those with disabilities. Accessibility is a legal and ethical requirement, but can be incrementally improved after core functionality works.

**Independent Test**: Can be tested by navigating the entire workflow using only keyboard (Tab, Enter, Space) and verifying all interactive elements are reachable and operable. Can be tested with a screen reader to verify all content is announced properly.

**Acceptance Scenarios**:

1. **Given** a voter using only a keyboard, **When** they press Tab repeatedly, **Then** focus moves through all interactive elements in logical order (zip input → submit button → copy button) with visible focus indicators
2. **Given** a voter using a screen reader, **When** an error message appears, **Then** the error is announced immediately via aria-live region
3. **Given** a voter using a screen reader, **When** they encounter deadline status indicators, **Then** the status is conveyed through text labels, not color alone
4. **Given** a voter using a keyboard, **When** they reach the copy button or state selector, **Then** they can activate it with Enter or Space keys

---

### Edge Cases

- What happens when a zip code maps to multiple states (e.g., 86515 → AZ/NM)?
  - System displays a state selector asking user to choose which state they're voting in
- What happens when all registration deadlines have passed?
  - System displays alert directing user to check registration status at provided URL
- What happens when no upcoming election is found for a state?
  - System displays message: "No upcoming elections found for [State]. Check [state election website] for updates."
- What happens when a zip code is valid format but not in the dataset?
  - System displays: "We don't have data for this zip code yet. We're working on adding all U.S. zip codes." with link to state election directory
- What happens when the clipboard API is unavailable (older browsers)?
  - System falls back to selecting all text in prompt area and shows instruction: "Press Ctrl+C / Cmd+C to copy"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept 5-digit numeric zip codes as input and reject non-numeric or incorrect-length values with inline validation
- **FR-002**: System MUST look up state(s) associated with submitted zip code from static JSON data
- **FR-003**: System MUST display state election summary including: state name, next election name/date, registration deadlines (online/mail/in-person), early voting dates, voter ID requirements, phone policy, sample ballot link, and county election office link
- **FR-004**: System MUST generate customized prompt by injecting state-specific information into a pre-filled context block appended after the base prompt text
- **FR-005**: System MUST calculate deadline status relative to current date and display both absolute date and relative status (days remaining or "passed")
- **FR-006**: System MUST provide "Copy to Clipboard" functionality that copies full prompt + pre-filled context as plain text
- **FR-007**: System MUST display visual confirmation when content is copied (button changes to "Copied!" for 2 seconds)
- **FR-008**: System MUST present state selector when zip code maps to multiple states
- **FR-009**: System MUST display appropriate error messages for: empty input, invalid format, zip not found, no upcoming election, all deadlines passed
- **FR-010**: System MUST be responsive across mobile (< 640px), tablet (640-1024px), and desktop (> 1024px) breakpoints
- **FR-011**: System MUST meet WCAG AA accessibility standards including keyboard navigation, screen reader compatibility, minimum color contrast (4.5:1), focus indicators, and aria labels
- **FR-012**: System MUST include required `data-testid` attributes on key elements (zip-input, zip-submit, zip-error, state-selector, state-info, prompt-output, copy-button, copy-confirmation, election-name, election-date, registration-status, no-election-message, not-found-message) for e2e testing

### Key Entities

- **Zip Code**: 5-digit U.S. postal code mapping to one or more state codes
- **State Election Data**: Comprehensive election information per state including elections array, registration deadlines, early voting periods, voting rules, and resource URLs
- **Election**: Individual election event with name, date, type (primary/general/runoff/special), and primary type (open/closed/semi-closed/semi-open)
- **Registration Deadline**: Deadline with date, method (online/mail/in-person), postmark vs received distinction, and calculated status
- **Customized Prompt**: Base AI research prompt text + dynamically generated pre-filled context block containing user's state-specific information

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter a zip code and receive a fully customized prompt in under 10 seconds (including reading the state info)
- **SC-002**: All interactive elements are operable via keyboard alone without requiring a mouse
- **SC-003**: The tool renders correctly at viewport widths from 375px (mobile) to 1920px (desktop) without horizontal scrolling
- **SC-004**: All 42 Playwright e2e tests pass, verifying core user flows work correctly
- **SC-005**: Tool meets WCAG AA accessibility standards as measured by Lighthouse accessibility score ≥ 90
- **SC-006**: Copy-to-clipboard functionality succeeds on all modern browsers (Chrome, Firefox, Safari, Edge) released in last 2 years
