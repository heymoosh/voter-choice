---
title: "feat: Build Ballot Research Tool"
type: feat
status: active
date: 2026-03-31
deepened: 2026-03-31
---

# feat: Build Ballot Research Tool

## Enhancement Summary

**Deepened on:** 2026-03-31
**Sections enhanced:** Technical Approach, Date Utils, Clipboard, Accessibility
**Research agents used:** Next.js/React 19 patterns, WCAG AA accessibility, date calculation, clipboard API

### Key Improvements
1. **Date utils**: Use `date-fns` to parse `YYYY-MM-DD` strings — avoids timezone off-by-one bugs; inject `today` as parameter for pure/testable functions
2. **Clipboard**: Use `useRef` for timeout cleanup to prevent stale closure bugs; check `window.isSecureContext` before using modern API; `document.execCommand` fallback for non-HTTPS
3. **Accessibility**: `role="alert"` + `aria-live="assertive"` for form errors (not polite); dynamic `aria-label` on copy button; focus management to results section after successful submission
4. **React 19**: Native `<select>` (not custom modal) for state selector — free keyboard/screen reader support; `useFormStatus` for submit button pending state

### New Considerations Discovered
- `new Date("2026-03-03")` has timezone ambiguity — always use `date-fns parse()` or append `T12:00:00Z`
- Deadline status badges need color + icon + text (WCAG 1.4.1 — not color alone)
- Skip link must be first element in `<body>` in layout.tsx; use `scroll-padding-top` for sticky headers
- Clear `setTimeout` ID in `useEffect` cleanup to prevent timer leaks on unmount

---

## Overview

Build a single-page Next.js web application that helps U.S. voters research their ballot using AI chatbots. Users enter their zip code, the app looks up state-specific election info from static JSON, generates a customized AI ballot research prompt, and the user copies it to paste into any free AI chatbot (Claude, ChatGPT, Gemini, Grok).

**Key constraints:** No LLM hosted, no user data stored, static JSON only, stub data for TX/CA/NH.

---

## Problem Statement / Motivation

Voters need personalized guidance for their specific state's election rules, deadlines, and ballot — but general AI prompts don't include local context. This tool bridges that gap by pre-filling state-specific dates, deadlines, and links into a research-quality prompt before the user even opens their chatbot.

---

## Proposed Solution

Single-page app with sequential sections:
1. Hero → 2. Zip Entry → 3. State Info Card → 4. Customized Prompt Output → 5. Tips → 6. Footer

Data layer: static JSON lookup (zip-to-state.json + per-state JSON files). All logic runs client-side. No API routes needed.

---

## Technical Approach

### Architecture

```
src/
├── app/
│   ├── layout.tsx          — metadata, skip-to-content (FIRST in body), root layout
│   ├── page.tsx            — Server Component: Hero, BallotToolClient, Tips, Footer
│   └── globals.css         — Tailwind 4 @import + @theme inline
├── components/
│   ├── BallotToolClient.tsx — "use client" state machine orchestrator
│   ├── ZipForm.tsx         — zip input + submit + inline errors
│   ├── StateInfoCard.tsx   — state election summary card
│   ├── PromptOutput.tsx    — full prompt + copy button
│   └── StateSelectorModal.tsx — native <select> for multi-state zip
├── lib/
│   ├── types.ts            — TypeScript interfaces for all data shapes
│   ├── lookupZip.ts        — zip → state code(s) lookup
│   ├── getStateData.ts     — load state JSON by code
│   ├── generatePrompt.ts   — build the customized prompt string
│   └── date-utils.ts       — deadline status logic (green/yellow/red/gray)
└── data/
    ├── zip-to-state.json
    └── states/{TX,CA,NH}.json
```

**Server/Client split:**
- `page.tsx` is a Server Component — static sections (Hero, Tips, Footer) render on server
- `BallotToolClient.tsx` is a `"use client"` component — all interactive state lives here
- JSON files are direct module-level imports — bundled at build time, zero runtime overhead

### Implementation Phases

#### Phase 1: Types + Data Layer

Files: `lib/types.ts`, `lib/lookupZip.ts`, `lib/getStateData.ts`, `lib/date-utils.ts`, `lib/generatePrompt.ts`

**Types (`lib/types.ts`):**
```typescript
export type PrimaryType = "open" | "closed" | "semi-closed" | "semi-open" | null;
export type ElectionType = "primary" | "general" | "runoff" | "special";
export type PhonePolicy = "prohibited" | "allowed" | "varies";
export type DeadlineStatus = "green" | "yellow" | "red" | "passed" | "unavailable";

export interface Election { id: string; name: string; date: string; type: ElectionType; isPrimary: boolean; primaryType: PrimaryType; }
export interface StateData { stateCode: string; stateName: string; lastUpdated: string; elections: Election[]; registration: Registration; earlyVoting: EarlyVoting; votingRules: VotingRules; resources: Resources; }
export interface DeadlineInfo { status: DeadlineStatus; daysRemaining: number | null; label: string; }
```

**Date utils (`lib/date-utils.ts`) — key patterns:**

```typescript
import { parse, startOfDay, differenceInDays } from "date-fns";

// ✅ Use date-fns parse — avoids new Date("YYYY-MM-DD") timezone bugs
export function parseISODate(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

// ✅ Inject today as parameter — pure function, fully testable
export function getDeadlineStatus(deadlineStr: string | null, today: Date): DeadlineInfo {
  if (!deadlineStr) return { status: "unavailable", daysRemaining: null, label: "Not available" };
  const days = differenceInDays(startOfDay(parseISODate(deadlineStr)), startOfDay(today));
  if (days < 0) return { status: "passed", daysRemaining: null, label: "Passed" };
  if (days <= 3) return { status: "red", daysRemaining: days, label: `${days} day${days === 1 ? "" : "s"} left` };
  if (days <= 14) return { status: "yellow", daysRemaining: days, label: `${days} days left` };
  return { status: "green", daysRemaining: days, label: `${days} days left` };
}
```

**`lookupZip`:** import zip-to-state.json at module level, return `string[] | null`

**`getStateData`:** switch on state code, import TX/CA/NH JSON, return typed `StateData | null`

**`generatePrompt`:** read BALLOT_PROMPT.md content, append pre-filled context block with all required fields

#### Phase 2: Components

**ZipForm:** controlled input, validates 5-digit numeric, uses `role="alert"` + `aria-live="assertive"` on error container (present in DOM at page load, empty until error), `aria-invalid` + `aria-describedby` on input, `aria-label` on submit button

**StateInfoCard:** displays election name/date, registration deadlines with DeadlineStatusBadge (color + icon + text), early voting, voter ID, links. After successful lookup, results section gets `tabIndex={-1}` and `.focus()` call for keyboard users.

**PromptOutput:** `<pre>` or scrollable `<div>` for prompt text, copy button with dynamic `aria-label` ("Copy to clipboard" → "Copied to clipboard"), `aria-live="polite"` announcement region (sr-only), 2s reset with `useRef` timeout cleanup

**StateSelectorModal:** native `<select>` element with `<label>` — not a custom dropdown. `data-testid="state-selector"` on the `<select>`.

**BallotToolClient:** state machine `idle → loading → found | not-found | multi-state`

#### Phase 3: Page + Layout

**`layout.tsx`:** skip link FIRST in `<body>` (before nav), `href="#main-content"`, CSS: `position: absolute; top: -40px; &:focus { top: 0; }`, `scroll-padding-top` for any sticky elements

**`page.tsx`:** `<main id="main-content">` wraps all content, Hero (h1), `<BallotToolClient>`, Tips, Footer

### Component state machine

```
idle        — show only ZipForm
loading     — show ZipForm (disabled), spinner
not-found   — show ZipForm + not-found-message
multi-state — show ZipForm + StateSelectorModal
found       — show ZipForm + StateInfoCard + PromptOutput
            — move focus to StateInfoCard after render
```

### Copy-to-clipboard pattern (stale closure-safe)

```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [copied, setCopied] = useState(false);

const handleCopy = useCallback(async () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // fallback: create textarea, select, execCommand
      fallbackCopy(text);
    }
    setCopied(true);
    timeoutRef.current = setTimeout(() => { setCopied(false); timeoutRef.current = null; }, 2000);
  } catch { /* show fallback message */ }
}, [text]);

useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
```

---

## System-Wide Impact

### Interaction Graph

ZipForm submit → `lookupZip(zip)` → if multi-state: show StateSelectorModal → on state select: `getStateData(code)` → `generatePrompt(data, zip)` → render StateInfoCard + PromptOutput → move focus to StateInfoCard. Copy button → check `isSecureContext` → `navigator.clipboard.writeText()` → 2s `useRef` timeout → reset button state.

### Error Propagation

- Invalid zip (not 5 digits): caught in ZipForm before lookup, `aria-live="assertive"` announces to screen readers
- Zip not found: `lookupZip` returns null → renders `not-found-message`
- State JSON missing: `getStateData` returns null → fallback to not-found
- Clipboard API unavailable: `isSecureContext` check → `execCommand` fallback; if both fail, show "select text and press Ctrl+C" message

### State Lifecycle Risks

All state is ephemeral (React component state), reset on page reload. No persistence layer. No risk of orphaned state. Only timer leak risk: mitigated by `useEffect` cleanup of `timeoutRef`.

### API Surface Parity

No API routes. Single surface: the UI component tree.

### Integration Test Scenarios

1. TX zip (73301) → shows TX election, deadlines calculated relative to today
2. CA zip (90210) → shows CA election with same-day reg note
3. NH zip (03031) → shows NH election with no early voting (shows "Not available")
4. Multi-state zip (86515) → shows state selector → pick AZ or NM → shows info
5. Unknown zip (99999) → shows not-found-message (no state-info visible)

---

## Acceptance Criteria

### Functional Requirements

- [ ] Zip entry: accepts only 5-digit numeric, shows validation error otherwise
- [ ] Valid TX/CA/NH zip: shows state-info card with correct election data
- [ ] Valid zip: generates full customized prompt with all required fields
- [ ] Copy button: copies full prompt to clipboard, shows "Copied!" for 2s
- [ ] Multi-state zip (86515): shows state-selector before displaying info
- [ ] Not-found zip: shows not-found-message
- [ ] All 13 `data-testid` attributes present on correct elements
- [ ] `no-election-message` shown when no upcoming election found

### Non-Functional Requirements

- [ ] Mobile layout at 375px: all elements render, prompt scrollable without losing copy button
- [ ] Touch targets: all interactive elements ≥ 44x44px
- [ ] WCAG AA: color contrast ≥ 4.5:1 (normal text), 3:1 (large text)
- [ ] Deadline status: communicated via color + icon + text (not color alone — WCAG 1.4.1)
- [ ] Form errors: `role="alert"` + `aria-live="assertive"` for immediate screen reader announcement
- [ ] Keyboard nav: tab order follows visual flow, Enter/Space activate buttons
- [ ] Skip-to-content link is FIRST element in body
- [ ] Copy button: dynamic `aria-label` updates after copy

### Quality Gates

- [ ] `next build` succeeds with no errors
- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run test` passes (unit tests for lib functions)
- [ ] Playwright e2e tests pass (all 42)
- [ ] No function exceeds cyclomatic complexity 10

---

## Success Metrics

- Playwright 42/42 e2e tests pass
- ESLint: 0 errors, 0 warnings
- `next build` succeeds
- Lighthouse accessibility ≥ 90 (targeting 100)
- 0% code duplication (jscpd)

---

## Dependencies & Prerequisites

- Next.js 15.5.12 + React 19 + Tailwind 4.2.1 (all installed)
- **date-fns** (add to package.json — needed for timezone-safe date parsing)
- Stub data: TX.json, CA.json, NH.json, zip-to-state.json (all present in src/data/)
- Shared e2e suite: e2e/ballot-tool.spec.ts (do NOT modify)
- BALLOT_PROMPT.md: raw prompt text to include in generatePrompt output

---

## Risk Analysis & Mitigation

| Risk | Mitigation |
|------|-----------|
| Timezone bugs in date comparison | Use `date-fns parse()` — never `new Date("YYYY-MM-DD")` directly |
| Cyclomatic complexity > 10 | Split BallotToolClient into sub-components; extract StatusBadge, DeadlineRow |
| Clipboard API unavailable | Check `window.isSecureContext`; `execCommand` fallback; final fallback: select-all message |
| Stale closure in copy timeout | Use `useRef` to store timeout ID; clear in `useEffect` cleanup |
| Multi-state zip UX | Native `<select>` (not custom modal) — free keyboard/AT support |
| Stale production server cache | Kill existing server before `npm run build && npm start` |
| WCAG failure on deadline badges | Always combine: color + icon/symbol + text label |
| Focus lost after form submission | Programmatically focus results section with `tabIndex={-1}` + `.focus()` |

---

## Implementation File List

```
src/lib/types.ts
src/lib/date-utils.ts
src/lib/lookupZip.ts
src/lib/getStateData.ts
src/lib/generatePrompt.ts
src/components/BallotToolClient.tsx
src/components/ZipForm.tsx
src/components/StateInfoCard.tsx
src/components/PromptOutput.tsx
src/components/StateSelectorModal.tsx
src/app/page.tsx                   (replace boilerplate)
src/app/layout.tsx                 (update metadata + skip link)
```

Test files to create:
```
src/lib/date-utils.test.ts
src/lib/lookupZip.test.ts
src/lib/getStateData.test.ts
src/lib/generatePrompt.test.ts
```

---

## Sources & References

### Internal References

- Feature spec: `docs/PROJECT_SPEC.md`
- Prompt template: `docs/BALLOT_PROMPT.md`
- E2e test contract: `e2e/ballot-tool.spec.ts`
- Stub data: `src/data/states/TX.json`, `src/data/states/CA.json`, `src/data/states/NH.json`
- Zip mapping: `src/data/zip-to-state.json`
- Complexity rule: `eslint.config.mjs` (max 10)
- Prettier config: `.prettierrc.json`

### Research Insights Applied

- date-fns timezone-safe parsing: avoids `new Date("YYYY-MM-DD")` ambiguity
- WCAG 1.4.1 Use of Color: status badges require color + icon + text
- WCAG 2.4.1 Bypass Blocks: skip link implementation in Next.js App Router
- React 19 useRef timeout pattern: prevents stale closures in clipboard reset
- Clipboard API fallback chain: `navigator.clipboard` → `execCommand` → manual select
