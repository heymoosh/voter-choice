# Feature Specification: Ballot Research Tool

**Feature Name**: ballot-research-tool
**Created**: 2026-05-11
**Status**: Ready for Planning
**Source**: docs/PROJECT_SPEC.md

---

## Overview

A single-page web application that helps U.S. voters research their ballot. The user enters their zip code, the site looks up their state's election information, and generates a customized AI prompt that voters can copy and paste into any free AI chatbot (Claude, ChatGPT, Gemini, Grok) to get personalized ballot research guidance.

The application operates entirely on the client side using static data — no user data is stored, no accounts, no cookies, no analytics.

---

## User Scenarios & Testing

### Primary Flow

1. User visits the page
2. User sees a hero section explaining the tool
3. User enters a 5-digit zip code and submits
4. System looks up the state(s) for that zip code
5. System displays state election info card (election dates, registration deadlines, voting rules)
6. System generates a customized AI prompt with state-specific context injected
7. User copies the full prompt + context block to clipboard
8. User pastes into their preferred AI chatbot to begin ballot research

### Multi-State Flow

1. User enters a zip code spanning multiple states (e.g., 86515)
2. System shows a state selector
3. User selects their state
4. System continues with primary flow from step 5

### Error Flows

- Empty submission: shows inline validation error
- Non-numeric or wrong length: shows validation error
- Zip not in dataset: shows "not found" message with directory link
- No upcoming election: shows appropriate message with link to state election website
- All registration deadlines passed: shows alert with registration check URL

---

## Functional Requirements

### FR-001: Hero Section

The page shall display a hero section with a headline, subtitle (2-3 sentences), and visual list of supported AI chatbots (Claude, ChatGPT, Gemini, Grok) with links.

### FR-002: Zip Code Input

The page shall provide a single text input for 5-digit U.S. zip codes with a submit button. The input shall accept only 5-digit numeric values. The input shall have `data-testid="zip-input"` and the button `data-testid="zip-submit"`.

### FR-003: Input Validation

- Empty submission shall show: "Please enter a zip code" in an element with `data-testid="zip-error"`
- Non-numeric or wrong length shall show: "Please enter a valid 5-digit zip code" in `data-testid="zip-error"`
- All error messages shall be announced to screen readers via `aria-live="polite"` or `role="alert"`

### FR-004: Zip-to-State Lookup

On valid zip submission, the system shall look up the state(s) from static JSON data. Multi-state zip codes shall show a state selector (`data-testid="state-selector"`).

### FR-005: State Info Display

After zip submission, display a summary card (`data-testid="state-info"`) with:

- State name
- Next upcoming election name (`data-testid="election-name"`) and date (`data-testid="election-date"`)
- Voter registration deadlines (online, by mail, in person) with status indicators in `data-testid="registration-status"`
- Early voting dates (if applicable)
- Link to state/county election office
- Link to sample ballot lookup
- State-specific voting rules (ID requirements, phone-at-polls policy)

### FR-006: Registration Deadline Status Indicators

Deadlines shall show color-coded AND text status:

- Green + "X days left": More than 14 days remaining
- Yellow + "X days left": 14 days or fewer remaining
- Red + "X days left": 3 days or fewer remaining
- Gray + "Passed": Deadline has passed

Status indicators must NOT rely solely on color — text labels are required.

### FR-007: Prompt Generation

System shall generate a customized prompt by combining the full ballot research prompt (from `docs/BALLOT_PROMPT.md`) with a state-specific pre-filled context block in the format specified in PROJECT_SPEC.md Section "Prompt Customization Logic".

The output area shall have `data-testid="prompt-output"`.

### FR-008: Copy to Clipboard

A "Copy to Clipboard" button (`data-testid="copy-button"`) shall copy the full prompt + context block as plain text. On success, the button shall show "Copied!" for 2 seconds in an element with `data-testid="copy-confirmation"`. If clipboard API unavailable, show fallback (select-all + keyboard instruction).

### FR-009: Not Found Message

When a zip code is not in the dataset, show a message with `data-testid="not-found-message"` including a link to a state election website directory.

### FR-010: No Election Message

When no upcoming election is found for a state, show a message with `data-testid="no-election-message"` linking to the state election website.

### FR-011: Tips Section

The page shall display static tips for using the prompt effectively (derived from BALLOT_PROMPT.md "Tips while you're in the conversation" section), including a reminder that AI can make mistakes.

### FR-012: Footer

The page shall include a footer with a "Share this tool" call to action, attribution line, and link to original prompt source.

### FR-013: Keyboard Navigation via Enter

The zip code input shall support form submission via Enter key press.

---

## Non-Functional Requirements

### NF-001: Privacy (HARD REQUIREMENT)

- No client-side persistence: no localStorage, sessionStorage, IndexedDB, cookies, or Cache API
- Zip codes and messages live only in component state, discarded on unmount
- No third-party network requests from client (only app's own routes)
- No server-side logging of user input
- API keys server-side only
- No eval(), Function(), dangerouslySetInnerHTML, or unsanitized DOM input

### NF-002: Accessibility (WCAG AA)

- All interactive elements keyboard-navigable (tab order follows visual flow)
- Form inputs have associated `<label>` elements
- Focus visibly indicated on all interactive elements
- Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- Skip-to-content link for keyboard users
- Logical heading hierarchy (h1 > h2 > h3)
- Images have alt text
- Error messages announced to screen readers

### NF-003: Responsive Design

- Mobile-first design
- Breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- Minimum 44x44px touch targets on all interactive elements
- Prompt output area scrollable on mobile without losing copy button

### NF-004: Performance

- Zip code lookup from static JSON should be near-instant
- Brief loading indicator prevents layout shift during lookup

### NF-005: Data

- All data served from static JSON files, no external API calls
- Stub data for TX, CA, NH (plus multi-state zip 86515 → AZ/NM)

---

## Required data-testid Attributes

| `data-testid`         | Element                                  |
| --------------------- | ---------------------------------------- |
| `zip-input`           | Zip code text input                      |
| `zip-submit`          | Submit button                            |
| `zip-error`           | Error message container                  |
| `state-selector`      | State selector for multi-state zips      |
| `state-info`          | State election info summary card         |
| `prompt-output`       | Full customized prompt container         |
| `copy-button`         | Copy to Clipboard button                 |
| `copy-confirmation`   | "Copied!" confirmation indicator         |
| `election-name`       | Election name display                    |
| `election-date`       | Election date display                    |
| `registration-status` | Registration deadline statuses container |
| `no-election-message` | No upcoming election message             |
| `not-found-message`   | Zip not in dataset message               |

---

## Success Criteria

1. Users can enter a zip code and receive state-specific election information within 1 second of submission
2. Users can copy a complete customized prompt to clipboard with one click
3. The tool works on mobile, tablet, and desktop viewports
4. All 13 required data-testid attributes are present on correct elements
5. All Playwright e2e tests pass
6. Registration deadlines calculate correctly relative to today's date
7. Multi-state zip codes correctly prompt state selection before showing information
8. All error states are handled gracefully with appropriate user-facing messages

---

## Out of Scope

- Hosting or running an LLM
- User accounts, authentication, or storing any user data
- Full 50-state data (stub data for TX, CA, NH sufficient)
- Deployment configuration
- Analytics or tracking
- Multiple language support

---

## Assumptions

- The `docs/BALLOT_PROMPT.md` file contains the full prompt text starting at "You are a nonpartisan civic research assistant..."
- "Next upcoming election" = first election with date >= today
- For AZ/NM multi-state zip (86515), no actual state data files are needed — just the state selector UI
- The app is built with Next.js 15 App Router, TypeScript, Tailwind CSS

---

## Clarifications

### Session 2026-05-11

- Q: Should multi-state zip codes (86515) require actual AZ and NM data files, or just demonstrate the selector UI? → A: Just demonstrate the state selector UI; full data files for AZ/NM are out of scope per PROJECT_SPEC.md "Stub Data States" (TX, CA, NH only)
- Q: Should the copy button fallback (select-all) auto-select text in the prompt area or show a message? → A: Show a message instructing user to select all and press Ctrl+C/Cmd+C, per PROJECT_SPEC.md "Copy to Clipboard" fallback spec
- Q: Where does the ballot prompt text come from? → A: From `docs/BALLOT_PROMPT.md` starting at "You are a nonpartisan civic research assistant...", per PROJECT_SPEC.md "Prompt Customization Logic" step 5
