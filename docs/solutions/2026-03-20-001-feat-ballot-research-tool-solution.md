---
type: feat
issue: feat-ballot-research-tool
plan: docs/plans/2026-03-20-001-feat-ballot-research-tool-plan.md
status: complete
branch: run2/compound-engineering
completed: 2026-03-20
---

# Solution: Ballot Research Tool

## What Was Built

A single-page Next.js app that lets voters enter their zip code and receive a customized AI research prompt pre-filled with their state's election info (deadlines, early voting, voter ID, resources). The prompt is ready to paste into any free AI chatbot.

## Architecture

```
src/
  types/election.ts           — TypeScript interfaces for StateData, Election, DeadlineInfo
  lib/election-data.ts        — Data access: getStatesForZip, getStateData, getNextElection, getDeadlineInfo, formatDate
  lib/prompt-generator.ts     — generatePrompt(state, zip) → {mainPrompt, contextBlock, fullText}
  app/page.tsx                — "use client" UI component (zip form, state selector, info card, prompt output)
  app/layout.tsx              — Title, description, viewport metadata
  data/states/{TX,CA,NH}.json — Static election data per state
  data/zip-to-state.json      — Zip → state code mapping
```

## Key Decisions

### Timezone-safe date comparison
Election deadlines are calendar dates, not UTC instants. Used local-date midnight construction:
```typescript
// getNextElection: ISO string comparison (YYYY-MM-DD, lexicographic = chronological)
const todayIso = new Date().toLocaleDateString("en-CA");
const upcoming = state.elections.filter((e) => e.date >= todayIso);

// getDeadlineInfo: explicit local-date midnight, no UTC drift
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const [year, month, day] = isoDate.split("-").map(Number);
const deadline = new Date(year, month - 1, day);
```

### Input validation without digit filter in onChange
Playwright's `.fill()` bypasses React synthetic `onChange` events. Filtering digits in `onChange` caused `.fill("abcde")` to produce empty state (filter ran on DOM but React state stayed `""`), so submit showed "empty" error instead of "valid format" error. Fix: allow all chars in `onChange`, validate regex in submit handler:
```typescript
onChange={(e) => setZipInput(e.target.value.slice(0, 5))}
// submit: if (!/^\d{5}$/.test(zip)) { setZipError("Please enter a valid 5-digit zip code"); }
```

### Multi-state zip handling
Some zips span state borders (e.g., 86515 → AZ + NM). When `getStatesForZip()` returns >1 state, a `<select data-testid="state-selector">` is rendered. Single-state zips skip directly to results.

### Null-safe resource links
`reg.registrationCheckUrl` is typed as `string` but may be `""` or not logically present. Guard with conditional render:
```typescript
{reg?.registrationCheckUrl && (
  <a href={reg.registrationCheckUrl} ...>Check your registration status →</a>
)}
```

## Test Results

- 42/42 e2e tests pass (Playwright, chromium-desktop + chromium-mobile)
- 0 ESLint errors (2 acceptable complexity warnings: Home component complexity 51, generateContextBlock 17)
- `next build` clean with no warnings

## Commits

```
8836273 phase1: add types, data layer, and CE plan
b8dd09f phase1: add prompt generator and fix OnlineRegistration type
bfdacc1 phase1: implement ballot research tool UI
e14f966 phase1: fix non-numeric input validation and viewport export
dd0719c phase1: apply ce:review fixes (timezone safety, null guards)
```

## CE Workflow Adherence

- **ce:plan**: Created `docs/plans/2026-03-20-001-feat-ballot-research-tool-plan.md` before writing code
- **ce:work**: Executed plan phases in order with intermediate commits
- **ce:review**: Multi-agent review found 3 actionable findings (P1: timezone, P2: null guard, P2: redundant condition), all applied
- **ce:compound**: This document

Artifacts: `metrics/workflow-log.jsonl`, `metrics/timing.jsonl`
