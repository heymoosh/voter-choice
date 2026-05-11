# Ballot Research Tool — Design Spec

**Date:** 2026-05-11
**Framework:** Superpowers
**Replicate:** r3
**Phase:** 1
**Source:** docs/PROJECT_SPEC.md

---

## Overview

A single-page Next.js 15 App Router application allowing U.S. voters to look up their state's election information and generate a customized AI research prompt by entering their zip code.

---

## Architecture

### Component Decomposition

```
src/app/
  page.tsx                    — Root page (orchestrates sections)
  layout.tsx                  — App layout with skip-to-content link
  globals.css                 — Global styles

src/components/
  ZipForm.tsx                 — Zip code input + validation + submit
  StateInfoCard.tsx           — State election info display card
  PromptOutput.tsx            — Customized prompt display + copy button
  StateSelector.tsx           — Multi-state zip selector
  TipsSection.tsx             — Static tips content
  DeadlineStatus.tsx          — Registration deadline status indicator
  Footer.tsx                  — Footer with share CTA

src/hooks/
  useElectionData.ts          — State management: zip lookup → state data → prompt generation

src/lib/
  zipLookup.ts                — Zip → state code lookup from static JSON
  stateDataLoader.ts          — Load state JSON from /api/state/[code]
  promptBuilder.ts            — Inject state data into ballot prompt template
  deadlineUtils.ts            — Calculate deadline statuses relative to today

src/app/api/
  state/[code]/route.ts       — Serve state JSON from src/data/states/

src/data/
  zip-to-state.json           — Already present, 23 zip codes
  states/TX.json              — Already present
  states/CA.json              — Already present
  states/NH.json              — Already present
```

### Data Flow

1. User types zip code → ZipForm validates (5-digit numeric)
2. Submit → useElectionData.lookup(zip) → zipLookup finds state code(s)
3. Single state: fetch /api/state/TX → StateDataLoader returns parsed JSON
4. Multi-state: show StateSelector, user picks → fetch that state's JSON
5. Find next upcoming election (date >= today)
6. promptBuilder injects state data into BALLOT_PROMPT.md template
7. Render StateInfoCard + PromptOutput

### Privacy Constraints (hard requirements from spec)

- No localStorage / sessionStorage / IndexedDB / cookies
- All data lives in React component state only
- No client-side analytics or telemetry
- API keys are server-side only (no LLM calls in this phase — prompts are generated client-side from static data)
- No dangerouslySetInnerHTML

---

## Component Specifications

### ZipForm
- `data-testid="zip-input"`, `data-testid="zip-submit"`, `data-testid="zip-error"`
- Validates: non-empty, exactly 5 digits, numeric only
- Submits on Enter key or button click
- Associated `<label>` for accessibility
- Min 44x44px touch target

### StateInfoCard
- `data-testid="state-info"`, `data-testid="election-name"`, `data-testid="election-date"`
- `data-testid="registration-status"`, `data-testid="no-election-message"`
- Shows: state name, next election, registration deadlines with status indicators
- Deadline statuses: green (>14 days), yellow (≤14 days), red (≤3 days), gray (passed)
- Text labels in addition to colors (WCAG accessibility)

### PromptOutput
- `data-testid="prompt-output"`, `data-testid="copy-button"`, `data-testid="copy-confirmation"`
- Shows full BALLOT_PROMPT.md text + customized context block
- Copy to clipboard via Clipboard API with textarea fallback
- "Copied!" state for 2 seconds

### StateSelector
- `data-testid="state-selector"`
- Select dropdown or radio group for multi-state zip codes
- Accessible keyboard navigation

### DeadlineStatus
- Visual badge + text label
- Colors: green/yellow/red/gray
- Always includes text ("12 days left", "Passed")

---

## Error States

| Condition | Element | Message |
|-----------|---------|---------|
| Empty submission | zip-error | "Please enter a zip code" |
| Non-numeric / wrong length | zip-error | "Please enter a valid 5-digit zip code" |
| Zip not found | not-found-message | "We don't have data for this zip code yet..." |
| Multi-state zip | state-selector | State picker shown |
| No upcoming election | no-election-message | "No upcoming elections found..." |

---

## API Route

`GET /api/state/[code]`
- Reads `src/data/states/${code}.json`
- Returns 404 for unknown state codes
- No user input logged

---

## Testing Strategy

### Vitest Unit Tests
- `zipLookup.ts` — lookup single state, multi-state, missing zip
- `promptBuilder.ts` — generates correct context block
- `deadlineUtils.ts` — deadline calculations, edge cases (today, tomorrow, passed)
- `stateDataLoader.ts` — fetch and parse

### Playwright E2E Tests
- Shared test suite in `e2e/ballot-tool.spec.ts` (not modified)
- All 13 data-testid attributes present

---

## Acceptance Criteria Reference

Per PROJECT_SPEC.md Acceptance Criteria section — all functional, responsive, and accessibility requirements must pass.
