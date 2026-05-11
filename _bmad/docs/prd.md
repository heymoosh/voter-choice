# PRD: Voter Choice — AI Ballot Research Tool

## Overview
A single-page web application providing personalized AI ballot research prompts for U.S. voters. Users enter their zip code to get state-specific election information and a customized prompt for any free AI chatbot.

## Functional Requirements

### FR-001: Zip Code Entry
- Single text input accepting only 5-digit numeric zip codes
- Submit button and Enter key submission
- Input validation with inline error messages
- data-testid: zip-input, zip-submit, zip-error

### FR-002: State Data Lookup
- Lookup state(s) from static JSON mapping (zip-to-state.json)
- Support multi-state zip codes (array of state codes)
- Load state election data from states/{stateCode}.json
- Find next upcoming election (first election date >= today)

### FR-003: State Info Display
- Show state name, next election name and date
- Voter registration deadlines (online, by mail, in person) with status indicators
- Early voting dates or "not available" message
- Link to state/county election office and sample ballot
- State-specific voting rules (ID requirements, phone policy)
- data-testid: state-info, election-name, election-date, registration-status

### FR-004: Prompt Generation
- Generate customized context block using state data and zip code
- Format per PROJECT_SPEC.md Prompt Customization Logic
- Display full prompt text from BALLOT_PROMPT.md + context block
- data-testid: prompt-output

### FR-005: Copy to Clipboard
- Copy full prompt + context as plain text
- Button shows "Copy to Clipboard" default state
- Shows "Copied!" for 2 seconds after successful copy
- Fallback for browsers without clipboard API
- data-testid: copy-button, copy-confirmation

### FR-006: Multi-State Zip Selector
- Show selector when zip spans multiple states
- data-testid: state-selector

### FR-007: Error States
- Empty input: "Please enter a zip code"
- Invalid format: "Please enter a valid 5-digit zip code"
- Zip not found: "We don't have data for this zip code yet..."
- All deadlines passed: alert with check-registration URL
- No upcoming election: message with state election website
- data-testid: zip-error, not-found-message, no-election-message

### FR-008: Deadline Status Indicators
- Green: >14 days remaining
- Yellow/Warning: 1-14 days remaining
- Red/Urgent: ≤3 days remaining
- Gray/Passed: deadline has passed
- Always show text label alongside color

## Non-Functional Requirements

### NFR-001: Privacy (Hard Requirements)
- No localStorage, sessionStorage, IndexedDB, cookies
- No third-party network requests from rendered page
- No server-side logging of user input
- No eval, Function(), or dangerouslySetInnerHTML
- API keys server-side only

### NFR-002: Accessibility (WCAG AA)
- All interactive elements keyboard-navigable
- Associated labels for all form inputs
- ARIA roles/labels on prompt output
- aria-live for error messages
- Skip-to-content link
- Logical heading hierarchy (h1 > h2 > h3)
- Color contrast ≥ 4.5:1 normal text, ≥ 3:1 large text
- Deadline statuses communicated via text, not only color

### NFR-003: Responsive Design
- Mobile-first, minimum 375px viewport
- Touch targets minimum 44x44px
- Breakpoints: <640px mobile, 640-1024px tablet, >1024px desktop
- Scrollable prompt output on mobile without losing copy button

### NFR-004: Performance
- Static JSON lookup (near-instant, <100ms)
- Loading state prevents layout shift after submit
- Next.js App Router with TypeScript

## Required data-testid Attributes
| Attribute | Element |
|-----------|---------|
| zip-input | Zip code text input |
| zip-submit | Submit button |
| zip-error | Inline error message |
| state-selector | Multi-state selector |
| state-info | State election info card |
| prompt-output | Full customized prompt container |
| copy-button | Copy to clipboard button |
| copy-confirmation | "Copied!" confirmation |
| election-name | Election name display |
| election-date | Election date display |
| registration-status | Registration deadlines container |
| no-election-message | No upcoming election message |
| not-found-message | Zip not found message |

## Data Model

### Zip-to-State Mapping
Static JSON: `src/data/zip-to-state.json`
Format: `{ "zipCode": ["stateCode"] }` (array for multi-state)

### State Election Data
Static JSON: `src/data/states/{stateCode}.json`
Schema: Per PROJECT_SPEC.md Data Model section

## Stub Data States
- Texas (TX): 73301
- California (CA): 90210
- New Hampshire (NH): 03031
- Multi-state (AZ/NM): 86515

## Acceptance Criteria
All criteria from PROJECT_SPEC.md Acceptance Criteria section must pass.
