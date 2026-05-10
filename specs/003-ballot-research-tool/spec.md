# Feature Specification: Ballot Research Tool

**Feature Branch**: `003-ballot-research-tool`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Ballot Research Tool — a privacy-first web app for U.S. voters. Single page: voter enters their zip code, app looks up their state's election info (primary type, registration deadlines, early voting, voting ID/phone rules), and generates a customized AI research prompt they can copy and paste into Claude, ChatGPT, or similar. State data served from local JSON files. Multi-state zip codes show a state selector. All required data-testid attributes for e2e testing. WCAG AA accessibility. No server-side storage of any user input."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Single-State Zip Lookup and Prompt Generation (Priority: P1)

A voter visits the tool, enters their zip code, and immediately sees their state's election information along with a fully customized AI research prompt they can copy and use in any AI chatbot.

**Why this priority**: This is the core value proposition — without this flow working end-to-end, the tool has no value. Everything else is an enhancement.

**Independent Test**: Can be fully tested by entering a single-state zip code (e.g., 78701 for Texas) and verifying that state election details are displayed and a populated prompt appears ready to copy.

**Acceptance Scenarios**:

1. **Given** a voter is on the tool homepage, **When** they enter a valid 5-digit zip code that maps to a single U.S. state, **Then** the tool displays that state's primary type, voter registration deadline, early voting window, photo ID requirement, and polling place phone policy.
2. **Given** state info is displayed, **When** the voter clicks the "Copy Prompt" button, **Then** a fully customized AI research prompt is copied to their clipboard and a 2-second "Copied!" confirmation is shown.
3. **Given** the voter has copied the prompt, **When** they paste it into Claude, ChatGPT, Gemini, or Grok, **Then** the prompt contains all relevant state-specific details pre-filled so the voter can start research immediately without re-entering information.
4. **Given** a voter enters a zip code, **When** the zip code is not found in the database, **Then** an informative error message is displayed with guidance and no personal data is stored or sent to any server.
5. **Given** a voter enters something that is not a 5-digit number, **When** they submit, **Then** a clear validation error is shown before any lookup is attempted.

---

### User Story 2 - Multi-State Zip Disambiguation (Priority: P2)

Some U.S. zip codes span state borders. When a voter's zip code matches multiple states, the tool asks them to select the correct state before proceeding.

**Why this priority**: Without this, voters in border zip codes would receive wrong or misleading information. It is a correctness requirement for a meaningful segment of users.

**Independent Test**: Can be fully tested by entering a multi-state zip code (e.g., 86515 for AZ/NM border area) and verifying that a state selection interface appears and correctly routes to the chosen state's information.

**Acceptance Scenarios**:

1. **Given** a voter enters a zip code that spans two or more states, **When** the lookup completes, **Then** a state selection interface is displayed listing all matching states.
2. **Given** a state selection interface is shown, **When** the voter selects a state, **Then** that state's election information is displayed exactly as it would be for a single-state zip lookup.
3. **Given** a state selection interface is shown, **When** the voter has not yet selected a state, **Then** no election information or prompt is generated.

---

### User Story 3 - Accessible and Keyboard-Navigable Interface (Priority: P3)

Every element of the tool — zip entry, state info display, state selector, and copy button — is fully usable by keyboard-only users and screen reader users.

**Why this priority**: WCAG AA accessibility is a legal and ethical requirement for a public civic tool. It must work for voters with disabilities.

**Independent Test**: Can be fully tested by navigating the entire flow using only keyboard (Tab, Enter, Space, arrow keys) and verifying all interactive elements are reachable and operable, all content is announced by screen readers via proper semantic HTML and aria attributes, and all deadline status indicators communicate status through text, not color alone.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** they Tab through the page, **Then** every interactive element receives a visible focus indicator and is reachable in logical order.
2. **Given** a screen reader user, **When** the state info updates after zip lookup, **Then** the updated content is announced automatically via a live region.
3. **Given** any user, **When** deadline status indicators are shown (e.g., registration closing soon), **Then** the status is conveyed through text labels and visual cues — not color alone — so colorblind users receive the same information.
4. **Given** a mobile user, **When** they interact with the tool on a small screen, **Then** all tap targets are at least 44×44 pixels and the layout is usable without horizontal scrolling.

---

### Edge Cases

- What happens when the voter's zip code matches a state not yet in the local data set? → Display a message that this state is not yet supported, with no personal data logged.
- What happens when the local state data file is malformed or missing fields? → Show a graceful error rather than a broken layout; do not expose raw error details to the voter.
- What happens when the voter changes their zip code after already viewing state info? → The previous state info and prompt are cleared and replaced with the new lookup result.
- What happens if the voter's browser does not support clipboard access? → Display the prompt text in a visible text area so the voter can manually select and copy it.
- What happens if the voter submits the form by pressing Enter rather than clicking the button? → The lookup proceeds identically to a button click.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept a 5-digit U.S. zip code as input and look up the corresponding state(s) from a local data source — no network request is made for this lookup.
- **FR-002**: System MUST display the following state election details when a single state is identified: primary election type, voter registration deadline, early voting start and end dates, voter ID requirements, and polling place phone policy.
- **FR-003**: System MUST generate and display a customized AI research prompt pre-filled with all state-specific election details.
- **FR-004**: System MUST provide a one-click copy-to-clipboard button for the generated prompt, with a visible 2-second "Copied!" confirmation after activation.
- **FR-005**: System MUST display a state selection interface when a zip code maps to more than one state, and proceed only after the voter selects one.
- **FR-006**: System MUST show a clear, user-friendly error message when the zip code is not found or is not a valid 5-digit number.
- **FR-007**: System MUST NOT send the voter's zip code, IP address, or any user input to any server-side logging system or third-party analytics service.
- **FR-008**: System MUST meet WCAG AA accessibility standards: all interactive elements must be keyboard-navigable, all images must have alt text, all form inputs must have associated labels, and error messages must be announced to screen readers.
- **FR-009**: System MUST use visible focus indicators on all interactive elements.
- **FR-010**: System MUST mark deadline statuses using at least two distinct visual cues (text label plus color or icon), not color alone.
- **FR-011**: All interactive and informational elements MUST carry stable `data-testid` attributes matching those specified in the shared e2e test suite.
- **FR-012**: System MUST provide a skip-to-main-content link for keyboard users.
- **FR-013**: System MUST clear and replace state info and generated prompt whenever the voter enters a new zip code.
- **FR-014**: When the voter's browser does not support clipboard API, the generated prompt MUST be displayed in a selectable text area as a fallback.

### Key Entities

- **ZipEntry**: A voter-provided 5-digit zip code. Has: raw value, validation status (valid/invalid/not-found), resolved state(s).
- **StateElectionData**: Election rules for a U.S. state. Has: state name, primary type (open/closed/semi-open/semi-closed), registration deadline (date + days-remaining + urgency status), early voting window (start date, end date, or "not available"), photo ID required (boolean + details), polling place phone policy (allowed/banned/restricted + description), resource links.
- **GeneratedPrompt**: The AI research prompt customized with state election details. Has: prompt text, source state, generation timestamp.
- **StateSelectorModal**: The disambiguation interface shown for multi-state zips. Has: list of candidate states, selected state (or null).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A voter can enter their zip code and have a fully populated, copy-ready AI research prompt in front of them in under 5 seconds from page load on a standard broadband connection.
- **SC-002**: 100% of interactive elements pass automated WCAG AA accessibility checks (0 violations in automated audit).
- **SC-003**: The generated prompt contains all required state-specific fields — no placeholder text or "N/A" for fields present in the state data.
- **SC-004**: Multi-state zip codes correctly route the voter to state-specific information with zero incorrect state assignments.
- **SC-005**: Zero voter inputs (zip codes, interactions) appear in any server log or are sent to any third-party service — verifiable by network inspection during a full session.
- **SC-006**: All 14 required `data-testid` attributes are present and stable across page renders, enabling the shared Playwright e2e suite to achieve ≥ 95% pass rate on the core flow.
- **SC-007**: The tool is fully usable by keyboard-only users — all interactive elements are reachable via Tab and operable via Enter/Space with no keyboard traps.

## Assumptions

- State data for at least TX, CA, and NH is pre-populated in local JSON files as defined in the project scaffold; additional states may be present.
- The zip-to-state mapping file is pre-populated with representative zip codes including at least one multi-state entry.
- "Server-side storage" means no zip codes or personal data appear in server logs or are transmitted to third-party analytics; standard HTTP access logs (which do not contain request bodies) are acceptable.
- The copy-to-clipboard feature uses the standard browser Clipboard API, with the text area fallback for unsupported browsers.
- Deadline urgency thresholds: ≤7 days remaining = "urgent" (red), 8–30 days = "approaching" (yellow), >30 days = "on track" (green), deadline passed = "closed" (gray).
- The tool is a single-page application with no routing — all state is held in memory and lost on page reload.
