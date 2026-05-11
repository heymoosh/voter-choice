# Feature Specification: Ballot Research Tool

**Feature ID:** 001
**Feature Name:** ballot-research-tool
**Status:** Ready for Planning
**Created:** 2026-05-11

---

## Overview

A single-page web application that helps U.S. voters research their ballot. Users enter their zip code, the site looks up election information for their state, and provides a customized AI prompt they can copy and paste into any free AI chatbot. When the AI chat service is unavailable or over budget, the tool gracefully degrades to this copy-paste experience.

---

## User Stories

### US1 (P1): Zip Code Lookup and State Info Display

**As a voter**, I want to enter my zip code and see my state's election information so that I know the key dates, deadlines, and rules before researching my ballot.

**Acceptance Criteria:**
- Voter enters a 5-digit zip code and submits
- The tool displays state election info including: election name and date, registration deadlines with status indicators (passed/days remaining), early voting dates, voter ID requirements, phone-at-polls policy, and links to official resources
- Invalid zip codes (non-numeric, wrong length, empty) show clear inline error messages
- Zip codes not in the dataset show a "not found" message with a link to a state election directory
- Multi-state zip codes show a state selector before displaying info

### US2 (P1): Customized Prompt Generation and Copy

**As a voter**, I want to get a customized ballot research prompt with my state's specific information pre-filled so that I can immediately start researching my ballot in any AI chatbot.

**Acceptance Criteria:**
- After a valid zip code is entered, the full ballot research prompt appears with state-specific context injected
- The prompt includes: election name, date, type, registration deadlines, early voting dates, voter ID info, phone-at-polls policy, sample ballot link, and county election office link
- A "Copy to Clipboard" button copies the full prompt + context block
- After copying, a "Copied!" confirmation appears for ~2 seconds then disappears
- If clipboard API is unavailable, fallback instructions appear (select-all + keyboard shortcut)

### US3 (P2): Responsive and Accessible Experience

**As a voter on any device**, I want the tool to work well on my phone, tablet, or computer so that I can use it wherever I am.

**Acceptance Criteria:**
- Layout renders correctly at mobile (375px), tablet (768px), and desktop (1280px) widths
- All interactive elements have minimum 44x44px touch targets
- Prompt output is scrollable on mobile without losing the copy button
- All interactive elements are keyboard-navigable in logical tab order
- Form inputs have associated labels
- Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Deadline status indicators include text labels, not just color
- Error messages are announced to screen readers
- Skip-to-content link is present
- Page has logical heading hierarchy (h1 > h2 > h3)

---

## Functional Requirements

### FR-001: Zip Code Input and Validation
- The zip code input accepts only 5-digit numeric values
- Empty submission shows: "Please enter a zip code"
- Non-numeric or wrong-length input shows: "Please enter a valid 5-digit zip code"
- Input validates on submit (not on every keystroke)

### FR-002: State Lookup
- The tool maps zip codes to state(s) using a static JSON dataset
- Zip codes covering multiple states present a state selector
- Unknown zip codes show the not-found message with external link

### FR-003: Election Data Display
- The "next upcoming election" is the first election with a date on or after today
- Registration deadlines show colored status indicators with text labels:
  - Green + "X days left" for > 14 days remaining
  - Yellow/amber + "X days left" for 1–14 days remaining  
  - Red + "X days left" for 1–3 days remaining
  - Gray + "Passed" when the deadline has passed
- When all registration deadlines have passed, show an alert with the registration check URL
- When no upcoming election is found, show a "no upcoming election" message with the state election website link

### FR-004: Prompt Customization
- The base prompt is the full text from docs/BALLOT_PROMPT.md (starting from "You are a nonpartisan civic research assistant...")
- The pre-filled context block is appended after the main prompt in this format:
  ```
  Hi! I'm voting in [State Name]. My zip code is [zip code].
  
  Here's what I know about my upcoming election:
  - Election: [name] on [formatted date]
  - Election type: [type] ([primaryType] primary / general)
  - Registration deadlines: Online by [date], by mail by [date] (postmark/received), in person by [date]
  - Early voting: [start] through [end] (or "Not available — absentee voting only")
  - Voter ID: [Required/Not required]. [Accepted IDs if required]
  - Phones at polls: [Policy detail]
  - My sample ballot: [sampleBallotLookup URL]
  - My county election office: [countyElectionLookup URL]
  
  Help me with my ballot.
  ```

### FR-005: Copy to Clipboard
- Copy button copies the complete prompt + context block as plain text
- "Copy to Clipboard" changes to "Copied!" with visual indicator for 2 seconds
- If clipboard API unavailable, text area is selected and keyboard shortcut instructions shown

### FR-006: Privacy and Security
- No client-side persistence (no localStorage, sessionStorage, IndexedDB, cookies, Cache API)
- No third-party network requests from the rendered page
- No server-side logging of user input (zip codes, chat messages)
- API keys server-side only
- No eval, Function() constructor, or dangerouslySetInnerHTML
- All data served from static JSON files — no external API calls at runtime

### FR-007: Required Test IDs
All of the following data-testid attributes must be present:
- `zip-input` — zip code text input
- `zip-submit` — submit button
- `zip-error` — inline validation/error message
- `state-selector` — state selector for multi-state zips
- `state-info` — state election info card
- `prompt-output` — full customized prompt container
- `copy-button` — copy to clipboard button
- `copy-confirmation` — "Copied!" confirmation indicator
- `election-name` — election name display
- `election-date` — election date display
- `registration-status` — registration deadline statuses
- `no-election-message` — no upcoming election message
- `not-found-message` — zip code not in dataset message

---

## Success Criteria

1. Voters can go from zip code entry to a copyable, personalized ballot research prompt in under 30 seconds
2. Error states cover all invalid input cases with clear, actionable messages
3. The tool works on mobile phones (primary use case — most users arrive from mobile social sharing)
4. All 13 required data-testid elements are present and functional
5. The tool requires no account, no login, and stores no user data

---

## Assumptions

- The ballot prompt base text is sourced from docs/BALLOT_PROMPT.md (section starting with "You are a nonpartisan civic research assistant...")
- Stub data covers only TX (73301), CA (90210), NH (03031), and a multi-state example (86515 → AZ/NM)
- "Today's date" for deadline calculations is computed at runtime from the client's system time
- The "next upcoming election" selection handles the edge case where no future elections exist in the data

---

## Out of Scope

- Hosting or running an LLM / AI chat integration on-site
- User accounts or data persistence
- Full 50-state dataset (stub data for TX, CA, NH only)
- Deployment configuration
- Analytics or tracking
- Multiple language support

---

## Clarifications

### Session 2026-05-11
- Q: Should the ballot prompt base text be read from docs/BALLOT_PROMPT.md at build time or hardcoded? → A: Read at build time and embed in the page (PROJECT_SPEC.md FR-004)
- Q: Should copy-to-clipboard fallback (non-API case) auto-select the text? → A: Yes, select-all the text in the prompt area and show "Press Ctrl+C / Cmd+C to copy" (PROJECT_SPEC.md §Copy to Clipboard)
- Q: How should multi-state zip codes display state info after selection? → A: Same state-info card as single-state, shown after user picks from the selector (PROJECT_SPEC.md §State Info Display)
