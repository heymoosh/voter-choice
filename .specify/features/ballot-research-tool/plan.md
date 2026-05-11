# Implementation Plan: Ballot Research Tool

**Feature**: ballot-research-tool
**Created**: 2026-05-11
**Branch**: experiment/spec-kit-r1
**Spec**: .specify/features/ballot-research-tool/spec.md

---

## Technical Context

### Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest (unit), Playwright (e2e)
- **Build**: Node.js 22.14.0

### Architecture Decision

**Single-page React client component** within Next.js App Router.

- `src/app/page.tsx` → main page (Server Component shell with Client Component ballot tool)
- `src/components/BallotTool.tsx` → primary client component (`"use client"`)
- `src/lib/zipLookup.ts` → zip-to-state lookup logic
- `src/lib/electionUtils.ts` → next-election finder, deadline status calculator
- `src/lib/promptBuilder.ts` → prompt + context block generator
- `src/data/zip-to-state.json` → zip to state mapping (exists)
- `src/data/states/TX.json`, `CA.json`, `NH.json` → state election data (exists)
- `docs/BALLOT_PROMPT.md` → full ballot prompt text (read at build time)

### Data Flow

1. User enters zip → BallotTool component state
2. Submit → lookupState(zip) from static JSON
3. If multi-state → show state selector
4. Load state data → find next election → calculate deadline statuses
5. Build prompt → render state info card + prompt output
6. Copy button → clipboard API

### Key Design Decisions

**Research: Static data vs API calls**

- Decision: Static JSON files (already in repo)
- Rationale: PROJECT_SPEC.md explicitly: "All data is served from static JSON files. No external API calls."
- Alternatives considered: API routes (rejected — unnecessary complexity)

**Research: Prompt text source**

- Decision: Import from `docs/BALLOT_PROMPT.md` or embed as constant
- Rationale: The prompt text is static; embedding as a TypeScript constant avoids file system reads at runtime
- Approach: Extract "The Prompt" section content from BALLOT_PROMPT.md at build time via a constant in `src/lib/promptBuilder.ts`

**Research: Client component strategy**

- Decision: Single `"use client"` BallotTool component, no server actions needed
- Rationale: No server-side logic required; all data is static; privacy requirement means no server logging
- Alternatives considered: Server Actions (rejected — adds complexity without benefit for static data lookup)

**Research: State for multi-state zip handling**

- Decision: When zip maps to multiple states, show inline state selector before proceeding
- Rationale: PROJECT_SPEC.md: "display a state selector and show info for the selected state"

---

## Project Structure

```
src/
  app/
    page.tsx              # Server Component — imports BallotTool
    layout.tsx            # Updated title/metadata
    globals.css           # Tailwind
  components/
    BallotTool.tsx        # Main "use client" component
    ZipForm.tsx           # Zip input + submit + validation
    StateSelector.tsx     # Multi-state selector
    StateInfoCard.tsx     # State election info display
    PromptOutput.tsx      # Prompt display + copy button
    TipsSection.tsx       # Static tips content
    Footer.tsx            # Footer
  lib/
    zipLookup.ts          # lookupState(zip) → string[] | null
    electionUtils.ts      # findNextElection(), getDeadlineStatus()
    promptBuilder.ts      # buildPrompt(stateData, zip) → string
    ballotPrompt.ts       # BALLOT_PROMPT_TEXT constant
  data/
    zip-to-state.json     # existing
    states/
      TX.json             # existing
      CA.json             # existing
      NH.json             # existing
  types/
    election.ts           # TypeScript interfaces for state data
```

---

## Constitution Check

No project constitution file found at `.specify/memory/constitution.md`. Proceeding with standard principles:

- Privacy hard requirements from spec NF-001 satisfied by design (client state only, no persistence)
- Accessibility NF-002 addressed in all interactive components
- No server-side user data logging by design

---

## Data Model

### StateData (TypeScript interface)

```typescript
interface Election {
  id: string;
  name: string;
  date: string; // ISO date
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
```

### DeadlineStatus

```typescript
type DeadlineStatus = "green" | "yellow" | "red" | "passed";

interface DeadlineInfo {
  date: string;
  status: DeadlineStatus;
  label: string; // "12 days left" | "Passed"
}
```

---

## Phase Summary

- **Phase 1 (Setup)**: TypeScript types, utility libs, ballotPrompt constant
- **Phase 2 (Foundational)**: Core utility functions (zipLookup, electionUtils, promptBuilder)
- **Phase 3 (US1 — ZIP + State Info)**: ZipForm, StateSelector, StateInfoCard, BallotTool main component
- **Phase 4 (US2 — Prompt + Copy)**: PromptOutput with copy functionality
- **Phase 5 (US3 — Static Content)**: TipsSection, Footer, updated layout
- **Phase 6 (Polish)**: Accessibility, responsive, layout polish

---

## Interfaces/Contracts

The app exposes no external APIs. Internal function contracts:

- `lookupState(zip: string): string[] | null` — returns state code array or null if not found
- `findNextElection(elections: Election[]): Election | null` — returns first election with date >= today
- `getDeadlineStatus(deadline: string): DeadlineInfo` — returns status and label for a deadline date
- `buildPrompt(stateData: StateData, zip: string): string` — returns full prompt + context block
