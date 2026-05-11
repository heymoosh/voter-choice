# Ballot Research Tool — Design Document

**Date:** 2026-05-11
**Phase:** 1
**Framework:** Superpowers
**Spec source:** docs/PROJECT_SPEC.md

---

## Overview

A single-page Next.js 15 App Router application that lets U.S. voters enter their zip code and receive a customized AI ballot research prompt they can copy into any free AI chatbot.

---

## Architecture

### Approach Selected: Client-side static JSON import

**Rationale:** The spec mandates static JSON data with no external API calls. Client-side React state is the simplest match for the single-page flow. No API routes are needed.

**Data flow:**
1. Static JSON files (`src/data/zip-to-state.json`, `src/data/states/{CODE}.json`) are imported at component load time
2. User enters zip → lookup in zip-to-state map → resolve state code(s)
3. Load matching state JSON → calculate election context → generate prompt
4. All state lives in React `useState` hooks — no persistence, no global store

### Component hierarchy

```
src/app/page.tsx (server component — layout shell only)
└── src/app/components/BallotTool.tsx (client component — all interactivity)
    ├── ZipEntry — zip input form with validation
    ├── StateSelector — shown only for multi-state zip codes
    ├── StateInfoCard — displays election info, registration deadlines
    ├── PromptOutput — full prompt + context block, copy button
    └── TipsSection — static tips content
```

### Data utilities

```
src/lib/zipLookup.ts       — look up state code(s) for a zip
src/lib/stateData.ts       — load and type-check state JSON
src/lib/promptBuilder.ts   — compose full prompt from BALLOT_PROMPT template + state context
src/lib/deadlineStatus.ts  — calculate deadline status (days remaining, color tier)
```

### Types

```
src/types/state.ts — StateData, Election, Registration, EarlyVoting, VotingRules, Resources
```

---

## Key Design Decisions

### 1. Election selection logic
- Today = 2026-05-11
- Find first election with `date >= today`
- TX: "2026 Texas Primary Runoff" on 2026-05-26 (15 days away)
- If no upcoming election, show `no-election-message`

### 2. Multi-state zip codes (86515 → AZ/NM)
- Show `state-selector` with the available state codes
- After selection, if no stub data exists for that state, show `not-found-message`

### 3. Prompt composition
- Full `BALLOT_PROMPT.md` text (starting at "You are a nonpartisan civic research assistant…") stored as a TypeScript string constant
- Pre-filled context block appended at the end, per spec format
- Combined text exposed in `data-testid="prompt-output"` container

### 4. Registration deadline status
- Green: >14 days remaining
- Yellow: ≤14 days remaining
- Red: ≤3 days remaining
- Gray: passed
- Always show text label alongside color

### 5. Privacy requirements
- No `localStorage`, `sessionStorage`, cookies, analytics
- No client-side persistence — all state in React `useState`
- API keys: N/A (no AI API calls in this phase)

---

## File Structure

```
src/
  app/
    page.tsx                      — server component shell, imports BallotTool
    layout.tsx                    — existing, add meta tags
    globals.css                   — existing Tailwind base
    components/
      BallotTool.tsx              — root client component
      ZipEntry.tsx                — zip input + submit + error display
      StateSelector.tsx           — multi-state selector dropdown
      StateInfoCard.tsx           — election info card with deadline statuses
      PromptOutput.tsx            — prompt text area + copy button
      TipsSection.tsx             — static tips
      Footer.tsx                  — footer with share CTA
  lib/
    zipLookup.ts                  — zip → state code(s)
    stateData.ts                  — state JSON loader + type validation
    promptBuilder.ts              — prompt composition
    deadlineStatus.ts             — deadline calculation helpers
  types/
    state.ts                      — TypeScript interfaces
  data/
    zip-to-state.json             — existing
    states/TX.json                — existing
    states/CA.json                — existing
    states/NH.json                — existing

tests/
  lib/zipLookup.test.ts
  lib/deadlineStatus.test.ts
  lib/promptBuilder.test.ts
```

---

## Acceptance Criteria Coverage

All `data-testid` attributes from PROJECT_SPEC.md are accounted for:
- `zip-input`, `zip-submit`, `zip-error` — ZipEntry
- `state-selector` — StateSelector
- `state-info`, `election-name`, `election-date`, `registration-status` — StateInfoCard
- `prompt-output`, `copy-button`, `copy-confirmation` — PromptOutput
- `no-election-message`, `not-found-message` — BallotTool (conditional renders)

---

## Testing Strategy

- **Unit tests (vitest):** zipLookup, deadlineStatus, promptBuilder
- **E2e tests (playwright):** shared suite in `e2e/ballot-tool.spec.ts` — must all pass
- **TDD:** Write failing unit tests first, then implement

---

## Out of Scope (Phase 1)

- AI chatbot integration (copy-paste flow only)
- 50-state data (TX, CA, NH stubs only)
- Deployment configuration
- Analytics, error tracking
