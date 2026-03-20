---
title: "feat: Build Ballot Research Tool"
type: feat
status: active
date: 2026-03-20
---

## Enhancement Summary

**Deepened on:** 2026-03-20
**Sections enhanced:** 7
**Research agents used:** TypeScript reviewer, Performance oracle, Security sentinel, Architecture strategist, Frontend races reviewer, Code simplicity reviewer, Design implementation reviewer

### Key Improvements

1. **Component decomposition** — Decompose page.tsx into focused components to stay under ESLint complexity-10 limit
2. **Multi-state zip simplification** — Use existing TX/CA states for 86515 multi-state test (no AZ/NM stubs needed)
3. **Cancelable copy timeout** — Use ref-based cancelable timer for copy confirmation (race condition fix)
4. **TypeScript discriminated unions** — ZipLookupResult as discriminated union for type-safe lookup
5. **Date utility isolation** — Extract deadline calculations to lib/date-utils.ts for Phase 2 i18n readiness
6. **Focus management** — Move focus to result area after zip submission for keyboard users
7. **Security headers** — Add CSP and security headers to next.config.ts

---

# feat: Build Ballot Research Tool

## Overview

Build a single-page Next.js web application that helps U.S. voters use AI chatbots to research their ballot. The user enters their zip code, the site looks up their state's election information, and generates a customized version of the AI ballot research prompt pre-filled with local dates, deadlines, links, and rules. The user copies the prompt and pastes it into any free AI chatbot.

## Problem Statement / Motivation

Voters lack accessible tools to get ballot-specific AI research help. This tool bridges the gap by customizing the existing BALLOT_PROMPT.md with state-specific election data, removing friction from the research process.

## Proposed Solution

Single-page Next.js app with these sections:

1. Hero section (static)
2. Zip code entry form → static JSON lookup
3. State election info display card
4. Customized AI prompt output with copy-to-clipboard
5. Tips section (static)
6. Footer (static)

All data served from static JSON files — no external API calls, no user data stored.

## Technical Approach

### Architecture

```
src/
  types/election.ts           - TypeScript interfaces matching JSON schema + ZipLookupResult discriminated union
  types/testids.ts            - data-testid constants (prevents typos, makes contract explicit)
  lib/election-data.ts        - Data access: lookupZip(), getStateData(), getNextElection()
  lib/date-utils.ts           - Deadline calculations, date formatting (isolated for Phase 2 i18n readiness)
  lib/prompt-generator.ts     - generateContextBlock(state, zip) → customized context string
  app/page.tsx                - Server component with nested <BallotToolClient /> for interactivity
  components/
    BallotToolClient.tsx      - "use client" - orchestration, zip state, form submission
    ZipForm.tsx               - Zip code form with validation
    StateInfoCard.tsx         - State election info display
    PromptOutput.tsx          - Prompt display + copy button (with cancelable timer)
    TipsSection.tsx           - Static tips (can be server component)
  data/states/TX.json         - Texas election data (stub, exists)
  data/states/CA.json         - California election data (stub, exists)
  data/states/NH.json         - New Hampshire election data (stub, exists)
  data/zip-to-state.json      - Zip code → state code mapping (update 86515 → ["TX","CA"])
```

**Key simplification:** No AZ.json or NM.json needed. Map zip 86515 → `["TX", "CA"]` in zip-to-state.json so the multi-state selector test uses existing state data.

### Key Technical Decisions

**1. Date Handling (CRITICAL — timezone-safe)**

```typescript
// lib/date-utils.ts
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseDateLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getDaysUntil(isoDate: string): number {
  const today = getTodayLocal();
  const target = parseDateLocal(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export type DeadlineStatus = "safe" | "warning" | "urgent" | "passed";

export function getDeadlineStatus(daysRemaining: number): DeadlineStatus {
  if (daysRemaining < 0) return "passed";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 14) return "warning";
  return "safe";
}

// For "next election" — ISO string comparison is TZ-safe:
export function getTodayISO(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ
}
```

**2. Discriminated Union for Zip Lookup (TypeScript best practice)**

```typescript
// types/election.ts
export type ZipLookupResult =
  | { type: "single-state"; stateCode: string }
  | { type: "multi-state"; states: string[] }
  | { type: "not-found" };

// Usage — TypeScript narrows correctly:
const result = lookupZip(zip);
if (result.type === "single-state") {
  // TypeScript knows result.stateCode exists
}
```

**3. Input Validation — Submit Handler Only (CRITICAL for Playwright)**

Playwright's `.fill()` bypasses React's synthetic onChange events. Filtering in onChange produces empty state, causing wrong error messages in tests.

```typescript
// CORRECT: validate on submit only
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const trimmed = zipInput.trim();
  if (!trimmed) {
    setZipError("Please enter a zip code");
    return;
  }
  if (!/^\d{5}$/.test(trimmed)) {
    setZipError("Please enter a valid 5-digit zip code");
    return;
  }
  performLookup(trimmed);
};

// DO NOT filter in onChange — breaks Playwright
```

**4. Cancelable Copy Timer (Race condition fix)**

Multiple rapid clicks on "Copy" can leave the UI in a stuck state without cancellation:

```typescript
const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleCopy = async () => {
  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  try {
    await navigator.clipboard.writeText(fullPromptText);
  } catch {
    return; // Clipboard unavailable, no state update
  }
  setCopied(true);
  copyTimeoutRef.current = setTimeout(() => {
    setCopied(false);
    copyTimeoutRef.current = null;
  }, 2000);
};

// Cleanup on unmount:
useEffect(
  () => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  },
  [],
);
```

**5. Focus Management After Zip Submission**

For keyboard accessibility, move focus to result area after lookup:

```typescript
const stateInfoRef = useRef<HTMLDivElement>(null);

// After setting state data:
setTimeout(() => stateInfoRef.current?.focus(), 0);
```

**6. data-testid Constants**

```typescript
// types/testids.ts
export const TEST_IDS = {
  ZIP_INPUT: "zip-input",
  ZIP_SUBMIT: "zip-submit",
  ZIP_ERROR: "zip-error",
  STATE_SELECTOR: "state-selector",
  STATE_INFO: "state-info",
  PROMPT_OUTPUT: "prompt-output",
  COPY_BUTTON: "copy-button",
  COPY_CONFIRMATION: "copy-confirmation",
  ELECTION_NAME: "election-name",
  ELECTION_DATE: "election-date",
  REGISTRATION_STATUS: "registration-status",
  NO_ELECTION_MESSAGE: "no-election-message",
  NOT_FOUND_MESSAGE: "not-found-message",
} as const;
```

**7. Component Decomposition (Complexity ≤ 10)**

The Home component is the single largest risk for complexity violations. Extract:

- `ZipForm` — form + validation state (owns zip input, submit handler, error display)
- `StateInfoCard` — receives `StateElectionData`, pure display
- `PromptOutput` — receives prompt text, owns copy state + timer
- `BallotToolClient` — orchestration only (zip state, lookup result routing)

Each component stays under complexity 10.

**8. Security Headers**

Add to `next.config.ts`:

```typescript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }];
}
```

### Static Data Loading

Import state JSON files statically. Build a registry:

```typescript
// lib/election-data.ts
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";
import zipToState from "@/data/zip-to-state.json";

const STATE_REGISTRY: Record<string, StateElectionData> = {
  TX: txData as StateElectionData,
  CA: caData as StateElectionData,
  NH: nhData as StateElectionData,
};
```

## System-Wide Impact

- **Interaction graph**: Zip input → `lookupZip()` → `getStateData()` → `getNextElection()` + deadline calculations → `generateContextBlock()` → clipboard write
- **Error propagation**: All errors are UI-level (synchronous). Invalid input → `setZipError()` → inline display. Not-found → `setLookupResult({ type: 'not-found' })` → not-found message rendered.
- **State lifecycle risks**: None — no server state, page refresh resets everything
- **API surface parity**: N/A
- **Integration test scenarios**: Multi-state zip, all-deadlines-passed, no-upcoming-election, clipboard unavailable fallback

## Acceptance Criteria

### Functional Requirements

- [ ] User can enter 5-digit zip and submit via button click or Enter key
- [ ] Valid Texas zip (73301) displays Texas election info card
- [ ] Valid California zip (90210) displays California election info card
- [ ] Multi-state zip (86515) shows `data-testid="state-selector"`
- [ ] State info card shows: state name, election name, election date, registration deadlines with status, early voting dates, voting rules, resource links
- [ ] Prompt output shows full BALLOT_PROMPT.md text + customized context block with all required fields
- [ ] Copy button copies full prompt text to clipboard using navigator.clipboard API
- [ ] Copy confirmation ("Copied!") shows for ~2 seconds then resets
- [ ] Multiple rapid copy clicks handled gracefully (cancelable timer)
- [ ] Empty submit shows "Please enter a zip code" in `data-testid="zip-error"`
- [ ] Non-numeric/wrong length shows "Please enter a valid 5-digit zip code" in `data-testid="zip-error"`
- [ ] Unknown zip shows `data-testid="not-found-message"`
- [ ] `next build` succeeds with no errors

### Required data-testid Attributes (all 13)

| Attribute             | Element                          |
| --------------------- | -------------------------------- |
| `zip-input`           | Zip code text input              |
| `zip-submit`          | Submit button                    |
| `zip-error`           | Validation/error message         |
| `state-selector`      | Multi-state dropdown             |
| `state-info`          | State election info card         |
| `prompt-output`       | Customized prompt container      |
| `copy-button`         | Copy to clipboard button         |
| `copy-confirmation`   | "Copied!" indicator              |
| `election-name`       | Election name display            |
| `election-date`       | Election date display            |
| `registration-status` | Registration deadlines container |
| `no-election-message` | No upcoming election message     |
| `not-found-message`   | Zip not found message            |

### Non-Functional Requirements

- [ ] All interactive elements keyboard-navigable (Tab + Enter/Space)
- [ ] Focus moves to result area after zip submission
- [ ] Color contrast WCAG AA (4.5:1 normal text)
- [ ] Deadline status indicators use text + color (not color alone)
- [ ] Skip-to-content link at top of page
- [ ] Error messages use `role="alert"` or `aria-live="polite"`
- [ ] Mobile-first responsive (375px, 768px, 1280px)
- [ ] ESLint complexity ≤ 10 per component (achieved via decomposition)

## Dependencies & Prerequisites

- `docs/BALLOT_PROMPT.md` — exists (load as static import or template string)
- `src/data/states/TX.json`, `CA.json`, `NH.json` — exist in scaffold
- Update `src/data/zip-to-state.json`: change `86515` to `["TX", "CA"]` (no AZ/NM stubs needed)
- No new npm dependencies (use native APIs: Intl.DateTimeFormat, navigator.clipboard)

## Risk Analysis

| Risk                                   | Severity | Mitigation                                                      |
| -------------------------------------- | -------- | --------------------------------------------------------------- |
| Timezone bugs in date calculation      | HIGH     | Use `lib/date-utils.ts` with local date construction throughout |
| Playwright onChange validation failure | HIGH     | Submit-only validation — zero filtering in onChange             |
| Copy timer race condition              | MEDIUM   | Cancelable timer with useRef (see code above)                   |
| ESLint complexity violation            | LOW      | Component decomposition keeps each file ≤ 10                    |
| BALLOT_PROMPT.md not in output         | MEDIUM   | Verify prompt output includes first paragraph of file in review |

## Implementation Plan

### Phase 1: Foundation

1. Update `src/data/zip-to-state.json` — change 86515 to `["TX", "CA"]`
2. Create `src/types/election.ts` — TypeScript interfaces + ZipLookupResult discriminated union
3. Create `src/types/testids.ts` — TEST_IDS constants
4. Create `src/lib/date-utils.ts` — timezone-safe date functions
5. Create `src/lib/election-data.ts` — lookupZip(), getStateData(), getNextElection()
6. Create `src/lib/prompt-generator.ts` — generateContextBlock() + full prompt assembly

### Phase 2: UI Components

7. Create `src/components/ZipForm.tsx` — form with submit-only validation
8. Create `src/components/StateInfoCard.tsx` — pure display component
9. Create `src/components/PromptOutput.tsx` — prompt + cancelable copy timer
10. Update `src/app/page.tsx` with `BallotToolClient` orchestration

### Phase 3: Quality Pass

11. Update `next.config.ts` with security headers
12. Run `npm run lint` — fix any ESLint errors (complexity should pass with decomposition)
13. Run `npm run build` — verify clean build

## Sources & References

- Feature spec: `docs/PROJECT_SPEC.md`
- Ballot prompt: `docs/BALLOT_PROMPT.md`
- E2e tests: `e2e/ballot-tool.spec.ts`
- State data: `src/data/states/TX.json`, `CA.json`, `NH.json`
- Zip mapping: `src/data/zip-to-state.json`
