# Product Requirements Document: Voter Choice

**Version:** 1.0
**Status:** Approved
**Source:** Product Brief + PROJECT_SPEC.md v2.0

---

## 1. Overview

Voter Choice is a free single-page web application helping U.S. voters research their ballot using AI. Users enter their zip code, get state-specific election info, and receive a customized prompt to paste into any free AI chatbot.

## 2. Goals

- Help voters quickly find election info relevant to their specific location
- Generate a customized AI research prompt pre-filled with state context
- Work on mobile-first, meeting WCAG AA accessibility standards
- Zero user data retention — no analytics, no accounts, no persistence

## 3. Functional Requirements

### FR-001: Zip Code Entry
- Single text input accepting 5-digit U.S. zip codes
- Input validation: empty → "Please enter a zip code"; non-numeric/wrong length → "Please enter a valid 5-digit zip code"
- `data-testid="zip-input"`, `data-testid="zip-submit"`, `data-testid="zip-error"`

### FR-002: State Lookup
- Lookup zip code in static JSON file (`src/data/zip-to-state.json`)
- If not found: show `data-testid="not-found-message"` with link to state election directory
- If multi-state: show `data-testid="state-selector"` dropdown
- Loading state during lookup (even though lookup is near-instant from static JSON)

### FR-003: State Election Info Display
- Show `data-testid="state-info"` card with:
  - State name
  - `data-testid="election-name"` — next upcoming election name
  - `data-testid="election-date"` — election date, formatted
  - `data-testid="registration-status"` — deadlines with color + text status indicators
  - Early voting dates or "not available" message
  - Voter ID requirements
  - Phones at polls policy
  - Links to state election website, sample ballot, county office
- If no upcoming election: show `data-testid="no-election-message"`
- If all deadlines passed: show alert with registration check link

### FR-004: Deadline Status Indicators
- Green: >14 days remaining
- Yellow/Warning: 1–14 days remaining
- Red/Urgent: ≤3 days remaining
- Gray/Passed: deadline has passed
- Must include text labels (not color alone)

### FR-005: Customized Prompt Output
- `data-testid="prompt-output"` containing full main prompt + state context block
- Context block format per PROJECT_SPEC.md Prompt Customization Logic
- Context includes: state name, zip, election name/date/type, registration deadlines, early voting, voter ID, phones policy, sample ballot URL, county office URL

### FR-006: Copy to Clipboard
- `data-testid="copy-button"` — copies full prompt text
- `data-testid="copy-confirmation"` — "Copied!" indicator visible for ~2 seconds
- Fallback: select-all + instructions if clipboard API unavailable

### FR-007: Required data-testid Attributes
All 13 data-testid attributes from PROJECT_SPEC.md must be present:
zip-input, zip-submit, zip-error, state-selector, state-info, prompt-output, copy-button, copy-confirmation, election-name, election-date, registration-status, no-election-message, not-found-message

## 4. Non-Functional Requirements

### NFR-001: Privacy & Security
- No client-side persistence (no localStorage, sessionStorage, cookies, IndexedDB, Cache API)
- No third-party network requests from rendered page
- No server-side logging of user input (zip codes, chat messages)
- API keys server-side only, never in client bundles
- No eval, Function(), dangerouslySetInnerHTML, or unsanitized DOM input

### NFR-002: Accessibility (WCAG AA)
- All interactive elements keyboard-navigable with visible focus indicators
- Form inputs have associated `<label>` elements
- Error messages use `aria-live="polite"` or `role="alert"`
- Skip-to-content link present
- Logical heading hierarchy (h1 > h2 > h3)
- Color contrast ≥4.5:1 for normal text, ≥3:1 for large text
- Deadline statuses communicated via text, not color alone

### NFR-003: Responsive Design
- Mobile-first (375px breakpoint)
- Tablet: 640–1024px; Desktop: >1024px
- Minimum 44×44px touch targets on all interactive elements
- Prompt output scrollable on mobile without losing copy button

### NFR-004: Performance
- Static JSON lookup — no external API calls for state data
- Page loads in under 3 seconds on mobile 4G

## 5. Data Requirements

### State Data (Stub — 3 States)
- TX (Texas): Open primary, strict voter ID, no early voting absentee only
- CA (California): Top-two primary, vote-by-mail default, same-day registration
- NH (New Hampshire): Same-day registration, no early voting period, phones vary by town

### Zip-to-State Mapping
- Includes TX, CA, NH zip codes
- Multi-state zip: 86515 → [AZ, NM]

## 6. Acceptance Criteria

Covered fully in PROJECT_SPEC.md Acceptance Criteria section. Key checklist:
- [ ] Valid zip shows correct state info
- [ ] Prompt contains all required fields
- [ ] Copy button works with confirmation
- [ ] Multi-state zip shows state selector
- [ ] All 13 data-testid attributes present
- [ ] Deadline colors + text labels correct
- [ ] Responsive at 375px, 768px, 1280px
- [ ] Keyboard navigation works
- [ ] ESLint passes, build succeeds, Playwright tests pass
