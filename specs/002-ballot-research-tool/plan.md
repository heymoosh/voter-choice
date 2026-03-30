# Implementation Plan: Ballot Research Tool

**Branch**: `run3/spec-kit` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-ballot-research-tool/spec.md`

## Summary

Build a single-page Next.js web application that accepts a U.S. zip code, looks up
state election data from static JSON, and generates a customized AI ballot research
prompt the voter can copy into any free chatbot. All data is static; no backend or
LLM hosting. TDD Iron Law applies to every utility function and component.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode)
**Primary Dependencies**: Next.js 15.5.12, React 19.1.0, Tailwind CSS
**Storage**: Static JSON files (bundled at build time) — N/A for runtime storage
**Testing**: Vitest (unit), Playwright (e2e), @lhci/cli (Lighthouse)
**Target Platform**: Web application (mobile-first, all modern browsers)
**Project Type**: Single-page web application (Next.js App Router)
**Performance Goals**: Lighthouse ≥ 90 all categories; static data lookup < 50ms
**Constraints**: No external API calls at runtime; no user data stored; WCAG AA
**Scale/Scope**: 3-state stub dataset; single page; ~5-10 React components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Accessibility First | PASS | All components must have keyboard nav, ARIA, WCAG AA contrast, skip link, aria-live for errors |
| II. Mobile-First | PASS | Tailwind mobile-first breakpoints; min 44×44px touch targets |
| III. Static Data / No Backend | PASS | All data in src/data/; no fetch to external APIs; no user data |
| IV. TDD (NON-NEGOTIABLE) | PASS | Every utility and component gets a failing test before implementation |
| V. Accurate Civic Info | PASS | Deadline calculations use deterministic date comparison; no-election message when needed |

All gates PASS. Phase 0 research complete. Phase 1 design complete. Proceed to tasks.

## Project Structure

### Documentation (this feature)

```text
specs/002-ballot-research-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── tasks.md             # Phase 2 output (from /speckit.tasks)
├── checklists/
│   └── requirements.md  # spec quality checklist
└── contracts/
    └── ui-contracts.md  # UI component contracts
```

### Source Code

```text
src/
├── app/
│   ├── layout.tsx           # Root layout: skip link, metadata, fonts
│   └── page.tsx             # Server component: imports BallotToolClient
├── components/
│   ├── BallotToolClient.tsx  # 'use client' root: all page state
│   ├── ZipForm.tsx           # zip input + validation errors
│   ├── StateInfoCard.tsx     # election info + deadline statuses
│   ├── PromptOutput.tsx      # full prompt text + copy button
│   └── StateSelectorModal.tsx # multi-state zip selector
├── lib/
│   ├── lookupZip.ts         # zipCode → string[] (state codes)
│   ├── getStateData.ts      # stateCode → StateElectionData | null
│   ├── getDeadlineStatus.ts # (dateISO, todayISO) → DeadlineStatus
│   └── generatePrompt.ts   # (state, zip) → CustomizedPrompt
└── types/
    └── election.ts          # All shared TypeScript interfaces

e2e/
└── ballot-tool.spec.ts      # Shared Playwright suite (pre-existing)

src/
└── **/__tests__/ or *.test.ts  # Vitest co-located tests
```

## Phase 0: Research — Completed

See `research.md`. No NEEDS CLARIFICATION items. All technology choices confirmed
from scaffold. Key decisions:
- Dynamic state data loaded via TypeScript import (not fetch) for simplicity in tests
- Pure functions in `src/lib/` for all data transformations
- Client-side state only (`useState`) — no server-side data fetching needed
- `getDeadlineStatus` accepts `todayISO` parameter for test determinism

## Phase 1: Design — Completed

### Data Model
See `data-model.md`. Key types: `StateElectionData`, `DeadlineStatus`,
`LookupResult` (discriminated union), `CustomizedPrompt`.

### UI Contracts
See `contracts/ui-contracts.md`. Defines component interfaces, data-testid contracts,
and error message text — the source of truth for Playwright tests.

### Source Files to Create (in dependency order)

1. `src/types/election.ts` — all TypeScript interfaces
2. `src/lib/lookupZip.ts` + tests
3. `src/lib/getStateData.ts` + tests
4. `src/lib/getDeadlineStatus.ts` + tests (inject todayISO param)
5. `src/lib/generatePrompt.ts` + tests (BALLOT_PROMPT.md as constant)
6. `src/components/ZipForm.tsx` + tests
7. `src/components/StateSelectorModal.tsx` + tests
8. `src/components/StateInfoCard.tsx` + tests
9. `src/components/PromptOutput.tsx` + tests
10. `src/components/BallotToolClient.tsx` + integration tests
11. `src/app/page.tsx` — update to use BallotToolClient
12. `src/app/layout.tsx` — update with skip link, metadata

### TDD Sequence per File

For each file above:
1. Create `<name>.test.ts[x]` with failing assertions
2. Run `npm test -- --run` to confirm RED
3. Create implementation to pass tests
4. Confirm GREEN
5. Commit `phase1: <name> — RED→GREEN`

## Complexity Tracking

No constitution violations. No complexity justification required.
