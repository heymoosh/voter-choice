# Feature Specification: Ballot Research Tool

**Feature ID**: 001  
**Short Name**: ballot-research-tool  
**Version**: 1.0  
**Status**: Ready for Planning  
**Date**: 2026-05-11  

---

## Overview

A single-page web application that helps U.S. voters research their ballot using AI. Users enter their zip code to look up state-specific election information, then receive a customized AI prompt they can paste into any free AI chatbot (Claude, ChatGPT, Gemini, Grok) to get personalized ballot research assistance.

The tool does not store any user data. No accounts, no cookies, no analytics. Privacy is a hard constraint.

---

## Goals

- Help voters quickly understand their upcoming election, registration deadlines, and voting rules
- Generate a personalized, copy-paste-ready AI prompt pre-filled with the voter's state context
- Work gracefully even when voters cannot or do not want to use an embedded AI chat

---

## Actors / User Personas

- **Voter**: Any U.S. voter who wants to research their ballot before election day. Primary audience is mobile users who discovered the tool via social media.

---

## Functional Requirements

### Core Lookup and Display

- FR-001: The application accepts a 5-digit numeric U.S. zip code as input
- FR-002: The application looks up the state(s) associated with the zip code from a static dataset
- FR-003: After a valid zip code submission, a state info card is displayed showing: state name, upcoming election name and date, voter registration deadlines (online / by mail / in person) with status indicators, early voting dates (if available), a link to the state/county election office, a link to sample ballot lookup, and state-specific voting rules (ID requirements, phone-at-polls policy)
- FR-004: Registration deadlines show a visual status: Green (>14 days), Yellow/Warning (≤14 days), Red/Urgent (≤3 days), Gray/Passed (deadline has passed) — communicated via both color AND text label
- FR-005: The next upcoming election is determined as the first election with a date on or after today's date
- FR-006: If a zip code spans multiple states, a state selector is displayed before showing state info

### Prompt Generation

- FR-007: After valid zip code submission, a customized AI prompt is generated combining the base ballot research prompt with a pre-filled context block containing: election name and date, election type, registration deadlines, early voting dates, voter ID requirements, phone-at-polls policy, sample ballot link, county election office link, and the user's zip code and state
- FR-008: The prompt output area displays the full combined prompt (base prompt + context block) with clear visual separation
- FR-009: A "Copy to Clipboard" button copies the entire prompt + context block as plain text
- FR-010: After successful copy, a confirmation indicator is visible for approximately 2 seconds
- FR-011: If the clipboard API is unavailable, a fallback is provided (select-all with keyboard copy instructions)

### Error and Edge Case Handling

- FR-012: Empty form submission shows an inline error: "Please enter a zip code"
- FR-013: Non-numeric or wrong-length input shows an inline error: "Please enter a valid 5-digit zip code"
- FR-014: A zip code not found in the dataset shows: "We don't have data for this zip code yet..."
- FR-015: When all registration deadlines for the next election have passed, an alert is shown directing the voter to verify their registration status
- FR-016: When no upcoming election is found for a state, a message is shown directing the voter to the state election website

### Content

- FR-017: A hero section explains the tool in one sentence with a subtitle and visual list of supported AI chatbots (Claude, ChatGPT, Gemini, Grok) with links
- FR-018: A tips section contains static guidance for using the prompt effectively and a reminder that AI can make mistakes
- FR-019: A footer contains a "share this tool" call to action and attribution

---

## Non-Functional Requirements

### Privacy and Security (HARD REQUIREMENTS)

- NFR-001: No client-side persistence of user input — no localStorage, sessionStorage, IndexedDB, cookies, or Cache API
- NFR-002: No third-party network requests from the rendered page except to the app's own API routes
- NFR-003: No server-side logging of user input (zip codes, chat messages must never appear in logs)
- NFR-004: API keys must be server-side only — never in client bundles
- NFR-005: No eval, no Function() constructor, no dangerouslySetInnerHTML, no unsanitized user input reaching the DOM
- NFR-006: Uploaded voter profiles must be treated as untrusted input with prompt injection protections

### Accessibility

- NFR-007: All interactive elements are keyboard-navigable with visible focus indicators
- NFR-008: Form inputs have associated label elements
- NFR-009: Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- NFR-010: Deadline statuses are communicated via text labels, not color alone
- NFR-011: Error messages are announced to screen readers (aria-live or role="alert")
- NFR-012: Page has a logical heading hierarchy (h1 > h2 > h3)
- NFR-013: A skip-to-content link is present for keyboard users
- NFR-014: Images (if any) have alt text

### Responsive Design

- NFR-015: Mobile-first design; breakpoints at 640px and 1024px
- NFR-016: All interactive elements have minimum 44x44px tap targets on mobile
- NFR-017: Prompt output area is scrollable on mobile without losing the copy button

### Performance

- NFR-018: Zip code lookup is from static JSON — near-instant; a loading state prevents layout shift

---

## User Scenarios

### Scenario 1: Voter looks up Texas zip code

1. User opens the app on their phone
2. User sees the hero section explaining the tool
3. User types "73301" in the zip code input and taps Submit
4. App shows brief loading state then displays Texas state info card
5. Card shows: "2026 Texas General Election" on November 3, 2026, registration deadlines with status indicators, early voting dates, voter ID requirements, phone-at-polls policy
6. Below the card, the full customized prompt appears with Texas context pre-filled
7. User taps "Copy to Clipboard"
8. Button changes to "Copied!" for 2 seconds
9. User pastes prompt into Claude.ai and begins their ballot research

### Scenario 2: Multi-state zip code

1. User enters zip code "86515"
2. App shows state selector: "This zip code spans multiple states. Which state are you voting in?"
3. User selects their state
4. App proceeds with selected state's info

### Scenario 3: Unknown zip code

1. User enters zip code "00000"
2. App shows: "We don't have data for this zip code yet. We're working on adding all U.S. zip codes. [Link to state election website directory]"

### Scenario 4: Invalid input

1. User types "abc" and submits
2. App shows inline error: "Please enter a valid 5-digit zip code"

---

## Data Model

### Zip-to-State Mapping

Static JSON file mapping 5-digit zip codes to arrays of state abbreviations (e.g., `{"73301": ["TX"], "86515": ["AZ", "NM"]}`).

### State Election Data

Per-state JSON objects containing: stateCode, stateName, lastUpdated, elections array (id, name, date, type, isPrimary, primaryType), registration deadlines (online/byMail/inPerson with dates and URLs), earlyVoting (available, startDate, endDate, notes), votingRules (idRequired, acceptedIds, phonesAtPolls, phonesAtPollsDetail, additionalRules), and resources (stateElectionWebsite, countyElectionLookup, sampleBallotLookup, pollingPlaceLookup).

### Stub States for Experiment

- TX (Texas): open primary, strict voter ID, phones prohibited at polls
- CA (California): top-two primary, vote-by-mail default, same-day registration
- NH (New Hampshire): same-day registration, no early voting period

---

## Required Test Attributes

The following `data-testid` attributes MUST be present on the correct elements (required by the shared Playwright e2e suite):

- `zip-input` — zip code text input
- `zip-submit` — submit button
- `zip-error` — inline error container
- `state-selector` — state selector for multi-state zip codes
- `state-info` — state election info summary card
- `prompt-output` — container holding the full customized prompt
- `copy-button` — Copy to Clipboard button
- `copy-confirmation` — "Copied!" confirmation indicator
- `election-name` — election name display within state-info
- `election-date` — election date display within state-info
- `registration-status` — container for registration deadline statuses
- `no-election-message` — message when no upcoming election found
- `not-found-message` — message when zip code not in dataset

---

## Scope Boundaries

**In scope:**
- Single-page app with zip lookup and prompt generation
- Static data for TX, CA, NH plus multi-state stub (86515)
- Copy-to-clipboard functionality
- All accessibility and responsive design requirements

**Out of scope:**
- Embedded AI chat (copy-paste model only)
- User accounts or any persistent storage
- Full 50-state dataset (stub data sufficient for Phase 1)
- Deployment configuration
- Analytics or tracking
- Multiple language support

---

## Success Criteria

- SC-01: A voter on any device can look up their zip code and receive their customized prompt in under 30 seconds
- SC-02: The copy button works on all major browsers (Chrome, Firefox, Safari, Edge)
- SC-03: The page is usable without a pointing device (full keyboard navigation)
- SC-04: All e2e tests pass on the shared Playwright test suite
- SC-05: No user input (zip codes) appears in any server-side log or error message

---

## Clarifications

### Session 2026-05-11

No critical ambiguities detected. All taxonomy categories assessed as Clear based on comprehensive source specification (PROJECT_SPEC.md v2.0). Coverage summary:

- Functional Scope & Behavior: **Clear** — full FR list with acceptance criteria
- Domain & Data Model: **Clear** — state JSON schema, zip mapping, stub states fully defined
- Interaction & UX Flow: **Clear** — user scenarios, error states, loading states all specified
- Non-Functional Quality Attributes: **Clear** — WCAG AA, privacy hard requirements, responsive breakpoints
- Integration & External Dependencies: **Clear** — static JSON only, no external APIs needed
- Edge Cases & Failure Handling: **Clear** — multi-state, not-found, no election, all-deadlines-passed covered
- Constraints & Tradeoffs: **Clear** — no analytics, no user storage, no 50-state data for Phase 1
- Terminology: **Clear** — consistent use of "customized prompt", "state info card", "context block"
- Completion Signals: **Clear** — all data-testid attributes enumerated, Playwright suite defined

---

## Assumptions

- Static JSON stub data for TX, CA, NH is pre-existing at `src/data/states/`
- Zip-to-state mapping stub data exists at `src/data/zip-to-state.json`
- Today's date is used to calculate deadline statuses and next election selection (calculated at render time in the browser)
- The base ballot research prompt lives in `docs/BALLOT_PROMPT.md`
- AZ and NM state data is NOT required for Phase 1 — the multi-state selector test only requires the selector to appear for zip 86515
