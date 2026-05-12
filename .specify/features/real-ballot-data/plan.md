# Implementation Plan: Real Ballot Data Integration

**Feature**: real-ballot-data
**Created**: 2026-05-12
**Branch**: experiment/spec-kit-r1
**Spec**: .specify/features/real-ballot-data/spec.md

---

## Technical Context

### Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest (unit), Playwright (e2e)
- **Build**: Node.js 22.14.0
- **API Keys**: GOOGLE_CIVIC_API_KEY, ANTHROPIC_VOTER_API (already in .env.local)

### Architecture Overview

Phase 3 extends Phase 2's architecture with:
1. **Server-side API routes** — proxy Google Civic + Anthropic calls (keys never in client bundle)
2. **Data access layer** — unified module abstracting all API sources behind a shared interface
3. **Session cache** — in-memory Map per zip code on the client, TTL 1 hour
4. **Progressive loading** — React state machine per data section
5. **Fallback chain** — API response → partial failure banner → full static fallback

### Key Design Decisions

**Decision: Next.js Route Handlers for API proxying**
- All external API calls in `src/app/api/` Route Handlers
- Client components call `/api/civic` and `/api/candidate`
- Rationale: Keeps API keys server-side; compatible with App Router; zero new dependencies

**Decision: Client-side in-memory cache**
- Module-level `Map<string, {data: LiveElectionData, fetchedAt: number}>` in data access layer
- TTL check: `Date.now() - fetchedAt < 3600000`
- Rationale: "We don't store your data" principle; no IndexedDB or localStorage needed

**Decision: Extended TypeScript interfaces (additive)**
- `LiveElectionData` extends `StateData` with new fields: `pollingLocation`, `ballotContests`, `apiAttribution`, `fetchedAt`
- `BallotContest` and `Candidate` types added
- Existing types unchanged to preserve Phase 1/2 data paths

**Decision: Voter ID JSON — create representative sample, not all 50 states**
- Full 50-state + DC coverage is a large data task; for this experiment generate the 3 states already in use (TX, CA, NH) plus a representative small set
- Spec requires all 50 states + DC; we'll generate all of them via a data module

**Decision: Anthropic candidate enrichment via API route**
- POST `/api/candidate` receives `{candidateName, race, state}` and returns structured summary
- Uses Anthropic SDK with web_search tool
- Called lazily when user expands a candidate panel

**Decision: Progressive loading via multi-section state**
- BallotTool manages per-section loading flags: `civicLoading`, `candidateLoading`
- Each section renders independently with `data-loading` testid while loading

---

## Project Structure Changes

New files to create:

```
src/
  app/
    api/
      civic/
        route.ts          # GET /api/civic?zip=XXXXX → LiveElectionData
      candidate/
        route.ts          # POST /api/candidate → CandidateEnrichment
  lib/
    dataAccess.ts         # Unified data access layer + session cache
    civicApi.ts           # Google Civic API client (server-side only)
    anthropicEnrich.ts    # Anthropic web_search candidate enrichment
  types/
    liveElection.ts       # Extended types: LiveElectionData, BallotContest, Candidate, VoterIdData
  data/
    voter-id/             # Voter ID JSON per state (50 states + DC)
      TX.json, CA.json, NH.json, ... (all 51)
  components/
    SkeletonSection.tsx         # Loading skeleton UI
    PollingLocation.tsx         # Polling place display
    BallotContests.tsx          # Ballot contests + candidate expansion
    CandidateDetailPanel.tsx    # Expandable candidate detail
    ApiErrorBanner.tsx          # Partial/full error banners
    DataAttribution.tsx         # Attribution footer

Modified files:
  src/components/BallotTool.tsx     # Integrate live data flow + cache
  src/components/StateInfoCard.tsx  # Add polling location + ballot contests sections
  src/lib/promptBuilder.ts          # Enrich context block with live data
  src/types/election.ts             # Extend (additive) with optional live fields
  src/lib/i18n/translations.en.ts   # Add new Phase 3 translation keys
  src/lib/i18n/translations.es.ts   # Add new Phase 3 translation keys (ES)
  e2e/ballot-tool.spec.ts           # Add Phase 3 e2e test cases
  .env.example                      # Already correct (from Phase 2 setup)
```

---

## API Contracts

### GET /api/civic?zip={zip}

**Request**: Query param `zip` (5-digit string)

**Response (success)**:
```json
{
  "pollingLocation": { "name": "...", "address": "...", "hours": "..." },
  "ballotContests": [
    {
      "contestId": "...",
      "name": "...",
      "type": "...",
      "candidates": [
        { "candidateId": "...", "name": "...", "party": "...", "photoUrl": "..." }
      ]
    }
  ],
  "electionName": "...",
  "electionDate": "...",
  "districts": { "county": "...", "congressional": "...", "stateSenate": "...", "stateHouse": "..." },
  "fetchedAt": 1746000000000
}
```

**Response (error)**:
```json
{ "error": "civic_unavailable", "message": "..." }
```

### POST /api/candidate

**Request body**:
```json
{ "candidateName": "...", "race": "...", "state": "..." }
```

**Response (success)**:
```json
{
  "votingRecord": "...",
  "topDonors": "...",
  "endorsements": "...",
  "sources": ["..."]
}
```

---

## Data Model

### LiveElectionData (extends StateData)
```typescript
interface LiveElectionData extends StateData {
  pollingLocation?: PollingLocation;
  ballotContests?: BallotContest[];
  districts?: Districts;
  voterIdData?: VoterIdData;  // from static JSON
  fetchedAt?: number;
  apiErrors?: ApiError[];
}
```

### BallotContest
```typescript
interface BallotContest {
  contestId: string;
  name: string;
  type: string;
  candidates: Candidate[];
}
```

### Candidate
```typescript
interface Candidate {
  candidateId: string;
  name: string;
  party?: string;
  photoUrl?: string;
}
```

### VoterIdData
```typescript
interface VoterIdData {
  state: string;
  voterIdRequired: boolean;
  idType: string;
  acceptedIds: string[];
  exceptions: string;
  provisionalBallot: boolean;
  provisionalBallotRules: string;
  phonesAtPolls: boolean;
  phonesAtPollsDetail: string;
  sourceUrl: string;
  lastVerified: string;
}
```

---

## Implementation Phases

### Phase 0: Research (complete — no unknowns)

All technical decisions resolved from spec and existing codebase analysis.

### Phase 1: Types and Server-Side API Routes

1. Create `src/types/liveElection.ts` with extended types
2. Create `src/lib/civicApi.ts` — Google Civic API client
3. Create `src/app/api/civic/route.ts` — proxy route
4. Create `src/lib/anthropicEnrich.ts` — candidate enrichment
5. Create `src/app/api/candidate/route.ts` — proxy route
6. Create voter ID JSON for all 50 states + DC

### Phase 2: Data Access Layer + Cache

7. Create `src/lib/dataAccess.ts` — unified data access + session cache
8. Unit tests for dataAccess.ts

### Phase 3: UI Components

9. Create `src/components/SkeletonSection.tsx`
10. Create `src/components/PollingLocation.tsx`
11. Create `src/components/BallotContests.tsx`
12. Create `src/components/CandidateDetailPanel.tsx`
13. Create `src/components/ApiErrorBanner.tsx`
14. Create `src/components/DataAttribution.tsx`

### Phase 4: Integration

15. Update `BallotTool.tsx` to use live data flow
16. Update `StateInfoCard.tsx` to display new sections
17. Update `promptBuilder.ts` to include enriched context
18. Add Phase 3 i18n keys (EN + ES)

### Phase 5: Tests and Polish

19. Add Phase 3 e2e tests (loading, partial failure, full failure, candidate expansion, cache)
20. Add unit tests for civicApi.ts and promptBuilder Phase 3 enrichment

---

## Constitution Check

No project constitution found. Proceeding with standard quality gates:
- API keys never in client bundle ✓ (addressed via API routes)
- No persistent storage ✓ (in-memory cache only)
- No external error reporting ✓ (console.error only)
- Additive type changes ✓ (existing interfaces extended, not replaced)
