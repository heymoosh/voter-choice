# Ballot Research Tool — Design Spec

**Date:** 2026-03-21
**Status:** Approved (autonomous — per workflow.md autonomous rules)
**Phase:** Phase 1

---

## Overview

A single-page Next.js 15 web app that helps U.S. voters generate a customized AI ballot research prompt. User enters a zip code, the app looks up state election data from static JSON, computes deadline statuses, and renders a pre-filled prompt they copy into any free AI chatbot.

No LLM, no user data stored, no external API calls.

---

## Architecture

**Approach: Server Components + Client Islands (Next.js App Router)**

- `src/app/page.tsx` — server component shell (metadata, skip-link, static layout)
- `src/app/layout.tsx` — existing root layout
- `src/components/BallotToolClient.tsx` — `"use client"` orchestrator, manages all state
- `src/components/ZipForm.tsx` — zip input, validation, submit
- `src/components/StateInfoCard.tsx` — state election info summary card
- `src/components/PromptOutput.tsx` — full prompt display + copy button
- `src/components/StateSelectorModal.tsx` — multi-state zip picker
- `src/lib/data.ts` — static data loading (zip lookup, state JSON)
- `src/lib/date-utils.ts` — deadline calculation, date formatting, relative labels
- `src/lib/prompt-generator.ts` — prompt text assembly (injects state data into BALLOT_PROMPT template)
- `src/types/election.ts` — TypeScript interfaces for state data schema

**Why this approach:**
- Server components render the outer shell (hero, tips, footer) at build time — fast initial load
- Client boundary is a single island: BallotToolClient owns all interactive state
- Static JSON imports work at module level (no async data fetching)
- Aligns with Next.js 15 App Router patterns

---

## Data Flow

1. User types zip → ZipForm validates (5-digit numeric)
2. On submit → BallotToolClient calls `lookupZip(zip)` from `src/lib/data.ts`
3. If multi-state → shows StateSelectorModal until user picks
4. With state code → calls `loadStateData(stateCode)` → returns StateData
5. Calls `generatePrompt(stateData, zip)` → returns { promptText, contextBlock }
6. Calls `computeDeadlineStatuses(stateData)` → returns deadline status array
7. Renders StateInfoCard + PromptOutput

---

## Components

### ZipForm
- Controlled input, `data-testid="zip-input"` and `data-testid="zip-submit"`
- Validates: non-empty, exactly 5 digits
- Error: `data-testid="zip-error"` with `aria-live="polite"`
- On valid submit: calls `onSubmit(zip)`

### StateInfoCard
- Shows state name, election name+date, registration deadlines with color+text status indicators, early voting, links, voting rules
- `data-testid="state-info"`, `data-testid="election-name"`, `data-testid="election-date"`, `data-testid="registration-status"`, `data-testid="no-election-message"`
- Status colors: green (>14 days), yellow (≤14), red (≤3), gray (passed)
- Status ALSO shown as text ("12 days left" / "Passed") — not color only

### PromptOutput
- Displays full BALLOT_PROMPT.md text + pre-filled context block
- `data-testid="prompt-output"`, `data-testid="copy-button"`, `data-testid="copy-confirmation"`
- Copy button uses `navigator.clipboard.writeText()` with fallback to textarea select
- "Copied!" confirmation for 2 seconds with checkmark

### StateSelectorModal
- Rendered when zip maps to multiple states
- `data-testid="state-selector"`
- Keyboard-accessible, ESC closes (resets to zip entry)

### BallotToolClient
- Manages: `zipInput`, `stateCode`, `stateData`, `error`, `loading`, `copied` state
- Renders all child components based on state
- Shows `data-testid="not-found-message"` when zip not in dataset
- After computing deadline statuses: if all three registration deadlines (online, byMail, inPerson) have passed, shows alert: "Registration deadlines for this election have passed. Check [registrationCheckUrl] to confirm your registration status." This is rendered as an `aria-live="polite"` alert within StateInfoCard above the deadline list.

---

## Lib Modules

### src/lib/data.ts
```ts
function lookupZip(zip: string): string[] | null   // returns state codes or null
function loadStateData(stateCode: string): StateData | null
```

### src/lib/date-utils.ts
```ts
function getNextElection(elections: Election[], today: Date): Election | null
function computeDeadlineStatus(deadline: string | null, today: Date): DeadlineStatus
// DeadlineStatus: { date, daysLeft, label, urgency: 'ok'|'warning'|'urgent'|'passed' }
function formatDate(isoDate: string): string  // "March 3, 2026"
```

### src/lib/prompt-generator.ts
```ts
// BALLOT_PROMPT.md content is embedded as a string constant (BALLOT_PROMPT_TEXT)
// in src/lib/prompt-generator.ts at build time via a static import or inline const.
// No runtime file reads.

function generatePromptText(stateData: StateData, zip: string, today: Date): string
// Returns: BALLOT_PROMPT_TEXT + "\n\n" + buildContextBlock(stateData, zip, today)

function buildContextBlock(stateData: StateData, zip: string, today: Date): string
// Returns the pre-filled "Hi! I'm voting in [State]..." second message
```

### src/types/election.ts
```ts
interface Election {
  id: string;
  name: string;
  date: string;
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

interface Registration {
  online: { available: boolean; deadline: string | null; url: string };
  byMail: { deadline: string; sincePostmarked: boolean };
  inPerson: { deadline: string; sincePostmarked: boolean };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes?: string;
}

interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

interface Resources {
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
}

interface StateData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}

interface DeadlineStatus {
  date: string | null;
  daysLeft: number | null;
  label: string;  // "12 days left" | "Passed" | "Not available"
  urgency: "ok" | "warning" | "urgent" | "passed" | "na";
}
```

---

## TDD Iron Law

Unit tests FIRST for all lib modules:
- `src/lib/__tests__/data.test.ts` — zip lookup, state load
- `src/lib/__tests__/date-utils.test.ts` — deadline calculation edge cases (today = deadline, tomorrow, 14 days, passed, null)
- `src/lib/__tests__/prompt-generator.test.ts` — prompt output structure, field injection

Component tests FIRST for each component (React Testing Library):
- `src/components/__tests__/ZipForm.test.tsx`
- `src/components/__tests__/StateInfoCard.test.tsx`
- `src/components/__tests__/PromptOutput.test.tsx`
- `src/components/__tests__/StateSelectorModal.test.tsx`
- `src/components/__tests__/BallotToolClient.test.tsx`

E2e: shared `e2e/ballot-tool.spec.ts` must pass.

**Zip-to-state data:** `src/data/zip-to-state.json` (already exists from Phase 0.3a). Static import in `src/lib/data.ts`.

---

## Required data-testid Map

| testid | Component |
|--------|-----------|
| `zip-input` | ZipForm |
| `zip-submit` | ZipForm |
| `zip-error` | ZipForm |
| `state-selector` | StateSelectorModal |
| `state-info` | StateInfoCard |
| `election-name` | StateInfoCard |
| `election-date` | StateInfoCard |
| `registration-status` | StateInfoCard |
| `no-election-message` | StateInfoCard |
| `not-found-message` | BallotToolClient |
| `prompt-output` | PromptOutput |
| `copy-button` | PromptOutput |
| `copy-confirmation` | PromptOutput |

---

## Accessibility

- Skip-to-content link in `layout.tsx`
- All inputs have `<label>` elements
- Error messages use `aria-live="polite"`
- Focus management: after zip submit, focus moves to state-info or error
- Color contrast WCAG AA
- Heading hierarchy: h1 (hero) → h2 (sections) → h3 (sub-items)
- Touch targets: min 44×44px

---

## Scope Boundaries

**In scope:**
- All features in PROJECT_SPEC.md
- TX, CA, NH stub data (already in src/data/)
- Unit tests for lib modules + e2e

**Out of scope (Phase 2+):**
- Spanish language support
- Full 50-state data
- Analytics, auth, deployment config
