# PROJECT_SPEC.md — Ballot Research Tool Feature Spec

**Version:** 2.0 (Production)
**Status:** Active
**Last updated:** April 12, 2026

This document describes the desired behavior and outcomes for the ballot research tool.

---

## Overview

A single-page web application that helps U.S. voters research their ballot with an AI-powered conversation. The user enters their zip code, the site looks up their state's election information, and opens an on-site chat with Claude Sonnet that walks them through every race and issue. At the end, the user gets a printable ballot summary and a downloadable voter profile for future elections.

When the monthly chat budget is exhausted, the site gracefully degrades to a copy-paste experience: users get a customized prompt they can take to any free AI chatbot (Claude, ChatGPT, Gemini, Grok).

The site does NOT store user data. Chat conversations live in browser memory only. No accounts, no cookies, no analytics.

### Privacy and security constraints (hard requirements)

* No client-side persistence of any user input. No `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or Cache API usage. The zip code the user types must live only in component state and must be discarded when the tab closes or the component unmounts.
* No third-party network requests from the rendered page except to the app's own API routes and the Anthropic API (proxied server-side). No analytics, no error tracking, no telemetry libraries.
* No server-side logging of user input. Zip codes and chat messages must never appear in any log line, server-rendered HTML outside the intended display, error message, or telemetry payload.
* API keys must be server-side only — never exposed in client bundles.
* No `eval`, no `Function()` constructor, no `dangerouslySetInnerHTML`, no unsanitized user input reaching the DOM.
* Uploaded voter profiles must be treated as untrusted input with prompt injection protections.

---

## User Flow

### Page: Home (single page)

The entire application is a single page with the following sequential sections:

#### 1. Hero Section

- Headline explaining what the tool does in one sentence
- Brief subtitle (2-3 sentences) explaining the concept: enter your zip code, get a customized AI prompt, paste it into any free chatbot
- Visual list of supported chatbots (Claude, ChatGPT, Gemini, Grok) with links

#### 2. Zip Code Entry

- Single text input for 5-digit U.S. zip code
- Submit button
- Input accepts only 5-digit numeric values
- On submit, the site looks up the state(s) associated with that zip code and displays the customized prompt

#### 3. State Info Display (appears after valid zip code submission)

After a valid zip code is entered, display a summary card showing:

- State name
- Next upcoming election name and date
- Voter registration deadlines (online, by mail, in person) with status indicators (e.g., "Deadline passed" / "X days remaining")
- Early voting dates (if applicable for the state)
- Link to the state/county election office
- Link to sample ballot lookup
- State-specific voting rules summary (ID requirements, phone-at-polls policy)

If a zip code spans multiple states, display a state selector and show info for the selected state.

#### 4. Customized Prompt Output

- The full AI ballot research prompt (from `docs/BALLOT_PROMPT.md`) with state-specific information injected
- The injected information appears as a pre-filled "second message" appended after the main prompt, in the format: "Hi! I'm voting in **[State]**. My zip code is **[zip code]**. [Additional context about upcoming election, key dates, and links to local resources.]"
- Clear visual separation between the prompt and the pre-filled context
- "Copy to Clipboard" button that copies the entire prompt + pre-filled context
- Visual confirmation when copied (e.g., button text changes to "Copied!" for 2 seconds)
- Brief instructions above the prompt: "Copy this prompt and paste it as your first message in any AI chatbot"

#### 5. Tips Section

- Static content with tips for using the prompt effectively (derived from the "Tips while you're in the conversation" section of BALLOT_PROMPT.md)
- Reminder that AI can make mistakes and to verify with official sources

#### 6. Footer

- "Share this tool" call to action
- Attribution line: "Created by a human using AI tools"
- Link to the original prompt source (if applicable)

---

## Data Model

All data is served from static JSON files. No external API calls.

### Zip-to-State Mapping

A lookup structure mapping 5-digit zip codes to state abbreviations. Zip codes that span multiple states map to an array of state codes.

```
{
  "90210": ["CA"],
  "73301": ["TX"],
  "86515": ["AZ", "NM"]
}
```

For the experiment, only stub data for 2-3 states is required (see Stub Data below). A full 50-state + territories dataset is populated later on the winning branch.

### State Election Data Schema

Each state has one JSON object with the following structure:

```jsonc
{
  "stateCode": "TX",                        // 2-letter USPS abbreviation
  "stateName": "Texas",                     // Full state name
  "lastUpdated": "2026-03-01",              // ISO date of last data update

  "elections": [
    {
      "id": "tx-2026-primary",
      "name": "2026 Texas Primary Election",
      "date": "2026-03-03",                 // ISO date
      "type": "primary",                    // "primary" | "general" | "runoff" | "special"
      "isPrimary": true,
      "primaryType": "open"                 // "open" | "closed" | "semi-closed" | "semi-open" | null
    }
  ],

  "registration": {
    "online": {
      "available": true,
      "deadline": "2026-02-02",             // ISO date, null if not available
      "url": "https://www.votetexas.gov/register-to-vote/"
    },
    "byMail": {
      "deadline": "2026-02-02",             // ISO date
      "sincePostmarked": true               // true = postmark date, false = received date
    },
    "inPerson": {
      "deadline": "2026-02-02",             // ISO date
      "sincePostmarked": false
    },
    "sameDayRegistration": false,
    "registrationCheckUrl": "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do"
  },

  "earlyVoting": {
    "available": true,
    "startDate": "2026-02-17",              // ISO date, null if no early voting
    "endDate": "2026-02-28",                // ISO date
    "notes": "Hours vary by county"         // Optional clarification
  },

  "votingRules": {
    "idRequired": true,
    "acceptedIds": [
      "Texas driver's license or ID card",
      "Texas Election Identification Certificate",
      "Texas personal ID card issued by DPS",
      "Texas concealed handgun license",
      "U.S. military ID with photo",
      "U.S. citizenship certificate with photo",
      "U.S. passport (book or card)"
    ],
    "phonesAtPolls": "prohibited",          // "prohibited" | "allowed" | "varies"
    "phonesAtPollsDetail": "Texas law prohibits wireless communication devices in the voting room. You may bring written notes.",
    "additionalRules": []                   // Array of strings for state-specific notes
  },

  "resources": {
    "stateElectionWebsite": "https://www.votetexas.gov/",
    "countyElectionLookup": "https://www.votetexas.gov/voting/where.html",
    "sampleBallotLookup": "https://www.votetexas.gov/voting/ballot-board.html",
    "pollingPlaceLookup": "https://www.votetexas.gov/voting/where.html"
  }
}
```

### Stub Data States

Phase 0.3a creates stub data for these states (chosen for variety):

1. **Texas (TX)** — Open primary, strict voter ID, phones prohibited at polls, no same-day registration
2. **California (CA)** — Semi-closed primary ("top-two"), vote-by-mail default, same-day registration, phones allowed
3. **New Hampshire (NH)** — Small state, same-day registration, no early voting period (absentee only), phones vary by town

---

## Prompt Customization Logic

When a user enters a valid zip code:

1. Look up the state(s) for that zip code
2. Find the next upcoming election (first election in the `elections` array with a date >= today)
3. Calculate deadline statuses (days remaining or "passed") for each registration method
4. Generate the pre-filled context block:

```
Hi! I'm voting in **[State Name]**. My zip code is **[zip code]**.

Here's what I know about my upcoming election:
- **Election:** [Election name] on [formatted date]
- **Election type:** [Type] ([primaryType] primary / general)
- **Registration deadlines:** Online by [date], by mail by [date] (sincePostmarked: [postmarked/received]), in person by [date]
- **Early voting:** [start date] through [end date] (or "Not available — absentee voting only")
- **Voter ID:** [Required/Not required]. [Accepted IDs if required]
- **Phones at polls:** [Policy detail]
- **My sample ballot:** [sampleBallotLookup URL]
- **My county election office:** [countyElectionLookup URL]

Help me with my ballot.
```

5. Append this context block after the main prompt text (from BALLOT_PROMPT.md, starting at "You are a nonpartisan civic research assistant...")

---

## UI Behavior

### Responsive Design

- **Mobile-first.** This tool went viral on Reddit — most users are on phones.
- Breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- All interactive elements must be touch-friendly (minimum 44x44px tap targets)
- The prompt output area must be scrollable on mobile without losing the copy button

### Loading States

- Show a brief loading indicator after zip code submission while looking up data
- The lookup is from static JSON so it should be near-instant, but the loading state prevents layout shift

### Error States

| Condition | Behavior |
|-----------|----------|
| Empty input, submit pressed | Show inline validation message: "Please enter a zip code" |
| Non-numeric or wrong length | Show inline validation message: "Please enter a valid 5-digit zip code" |
| Zip code not found in dataset | Show message: "We don't have data for this zip code yet. We're working on adding all U.S. zip codes. [Link to state election website directory]" |
| Multi-state zip code | Show state selector: "This zip code spans multiple states. Which state are you voting in?" |
| All registration deadlines passed | Show alert: "Registration deadlines for this election have passed. Check [registration check URL] to confirm your registration status." |
| No upcoming election found | Show message: "No upcoming elections found for [State]. Check [state election website] for updates." |

### Copy to Clipboard

- Clicking the copy button copies the full prompt text + pre-filled context block as plain text
- Button shows "Copy to Clipboard" in default state
- Button changes to "Copied!" with a visual indicator (e.g., checkmark icon) for 2 seconds after successful copy
- If clipboard API is not available (rare, older browsers), show a fallback: select-all the text in the prompt area and show "Press Ctrl+C / Cmd+C to copy"

### Deadline Status Indicators

- Registration deadlines should show a visual status:
  - **Green:** More than 14 days remaining
  - **Yellow/Warning:** 14 days or fewer remaining
  - **Red/Urgent:** 3 days or fewer remaining
  - **Gray/Passed:** Deadline has passed
- Display both the date and a relative indicator ("12 days left" / "Passed")

---

## Accessibility Requirements

This is a civic tool for ALL voters. Accessibility is a functional requirement.

- All interactive elements are keyboard-navigable (tab order follows visual flow)
- Form inputs have associated `<label>` elements
- The copy button and state selector are operable via keyboard (Enter/Space)
- Focus is visibly indicated on all interactive elements
- Color contrast meets WCAG AA (minimum 4.5:1 for normal text, 3:1 for large text)
- Deadline status indicators do NOT rely solely on color — include text labels ("Passed", "12 days left")
- The prompt output area is accessible to screen readers (use appropriate ARIA roles/labels)
- Images (if any) have alt text
- The page has a logical heading hierarchy (h1 > h2 > h3)
- Skip-to-content link for keyboard users
- Error messages are announced to screen readers (use `aria-live="polite"` or `role="alert"`)

---

## Required `data-testid` Attributes

The following `data-testid` attributes MUST be present on the specified elements. These are required by the shared Playwright e2e test suite and must be consistent across all workflow implementations.

| `data-testid` | Element | Purpose |
|----------------|---------|---------|
| `zip-input` | The zip code text input field | E2e tests type into this field |
| `zip-submit` | The zip code submit button | E2e tests click this to submit |
| `zip-error` | The inline validation/error message container | E2e tests verify error states |
| `state-selector` | The state selector (for multi-state zip codes) | E2e tests select a state |
| `state-info` | The state election info summary card | E2e tests verify info display |
| `prompt-output` | The container holding the full customized prompt | E2e tests verify prompt content |
| `copy-button` | The "Copy to Clipboard" button | E2e tests click and verify copy |
| `copy-confirmation` | The "Copied!" confirmation indicator | E2e tests verify feedback |
| `election-name` | The election name display within state-info | E2e tests verify correct election |
| `election-date` | The election date display within state-info | E2e tests verify correct date |
| `registration-status` | Container for registration deadline statuses | E2e tests verify deadline logic |
| `no-election-message` | Message shown when no upcoming election is found | E2e tests verify this edge case |
| `not-found-message` | Message shown when zip code is not in dataset | E2e tests verify this edge case |

---

## Acceptance Criteria

A workflow run is "done" when ALL of the following are true:

### Functional

- [ ] User can enter a 5-digit zip code and submit
- [ ] Valid zip code displays the correct state election info (verified against stub data)
- [ ] Valid zip code generates the correct customized prompt with state-specific info injected
- [ ] The pre-filled context block includes: election name, date, type, registration deadlines, early voting dates, voter ID info, phone-at-polls policy, sample ballot link, and county election office link
- [ ] Copy button copies the full prompt + context to clipboard
- [ ] Copy confirmation appears and disappears after ~2 seconds
- [ ] Multi-state zip codes show a state selector
- [ ] Invalid inputs show appropriate error messages
- [ ] Zip codes not in the dataset show the "not found" message
- [ ] Registration deadline statuses calculate correctly relative to today's date
- [ ] All required `data-testid` attributes are present on the correct elements

### Responsive Design

- [ ] Layout renders correctly at mobile (375px width), tablet (768px), and desktop (1280px) breakpoints
- [ ] All interactive elements have minimum 44x44px touch targets on mobile
- [ ] Prompt output is scrollable on mobile without losing the copy button

### Accessibility

- [ ] All interactive elements are keyboard-navigable
- [ ] Tab order follows visual layout
- [ ] Form inputs have associated labels
- [ ] Color contrast meets WCAG AA
- [ ] Deadline statuses are communicated via text, not only color
- [ ] Error messages are announced to screen readers
- [ ] Skip-to-content link is present
- [ ] Page has logical heading hierarchy

### Code Quality (measured, not required to be perfect)

- [ ] No build errors (`next build` succeeds)
- [ ] ESLint runs without crashing
- [ ] Playwright e2e tests pass (shared test suite)
- [ ] Any workflow-generated tests pass

---

## Out of Scope

These are explicitly NOT part of the build:

- Hosting or running an LLM
- User accounts, authentication, or storing any user data
- Full 50-state data (stub data for 2-3 states is sufficient for the experiment)
- Deployment configuration (Vercel setup happens on the winning branch)
- Analytics or tracking
- The AI chatbot conversation itself (that happens in the user's own chatbot)
- Multiple language support (that's Phase 2)
