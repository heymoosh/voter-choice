# PRD: Phase 3 — Real Ballot Data Integration

## Overview
Replace static JSON stubs with live election data from free public APIs. Add a clean data-access layer, caching, loading states, error handling, and candidate enrichment via Anthropic web_search.

## User Stories

### US-1: Live Election Data by Zip Code
As a voter, when I enter my zip code, I see real election data for my location (not stub data), so I have accurate information for research.

**Acceptance Criteria:**
- Google Civic API queried with zip code
- Real ballot contests, polling location, and election dates displayed
- Data displayed per zip code, not per static stub file

### US-2: Candidate Enrichment
As a voter, I can expand a candidate's panel to see their voting record, top donors, and endorsements fetched live from the web.

**Acceptance Criteria:**
- "View voting record" button visible for each candidate in a ballot race
- Clicking expands inline panel with enrichment data
- Data fetched via Anthropic web_search at expand-time (lazy load)
- Panel collapses on second click
- Loading state visible during enrichment fetch

### US-3: Voter ID Requirements
As a voter, I see accurate voter ID requirements for my state, even if the Civic API is unavailable.

**Acceptance Criteria:**
- Voter ID data available for all 50 states + DC via static JSON
- Displays accepted IDs, exceptions, provisional ballot rules
- Shows "Verify at [state election office link]" note
- `lastVerified` date visible to users

### US-4: Loading States
As a voter, I see visual feedback while data is being fetched, so I know the app is working.

**Acceptance Criteria:**
- Skeleton UI shown in each section while loading
- Submit button shows spinner during fetch
- `data-testid="data-loading"` on loading sections
- Progressive display: sections appear as data arrives

### US-5: Graceful Degradation
As a voter, if an API is unavailable, I still see useful information and a clear non-alarming message.

**Acceptance Criteria:**
- Partial failure: available data shown + `data-testid="api-partial-error"` warning banner
- Full failure: voter ID static fallback + `data-testid="api-full-error"` message
- 10-second timeout per API source
- Never crashes or shows blank page

### US-6: Data Attribution
As a voter, I can see where the data comes from.

**Acceptance Criteria:**
- `data-testid="data-attribution"` footer on state info card
- Shows data source and "Updated [timestamp]"

### US-7: Multilingual Support
As a Spanish-speaking voter, all Phase 3 UI text is available in Spanish.

**Acceptance Criteria:**
- All new text keys have `en` and `es` translations
- i18n architecture unchanged (adding more languages requires only content)

## Technical Requirements

### API Integration
- Google Civic API: `/api/civic?zip=` server-side route
- Anthropic candidate detail: `/api/candidate-detail` server-side route
- API keys in `.env.local`, never client-side
- `.env.example` committed with placeholder values

### Caching
- `Map<zipCode, {data, timestamp}>` in module scope (server process lifetime)
- TTL: 1 hour
- Per zip code, per API source

### Data Model Extensions (additive)
```typescript
// New fields added to existing model
interface LiveElectionData {
  zipCode: string;
  stateCodes: string[];
  pollingLocation?: PollingLocation;
  ballotContests?: BallotContest[];
  voterIdInfo?: VoterIdInfo;
  fetchedAt: string;
  errors?: PartialError[];
}

interface BallotContest {
  office: string;
  candidates: Candidate[];
}

interface Candidate {
  name: string;
  party?: string;
  candidateId?: string;
}

interface VoterIdInfo {
  voterIdRequired: boolean;
  idType: string;
  acceptedIds: string[];
  exceptions: string;
  provisionalBallot: boolean;
  sourceUrl: string;
  lastVerified: string;
}
```

### Required data-testid attributes (new in Phase 3)
- `polling-location` — polling place section
- `ballot-contests` — ballot contests section
- `candidate-detail` — individual candidate info block
- `data-loading` — loading skeleton sections
- `api-partial-error` — partial API failure banner
- `api-full-error` — full API failure fallback
- `data-attribution` — data source footer

## Out of Scope
- Vietnamese, Chinese, Arabic (Phase 4)
- LLM chat window (Phase 5)
- User accounts or persistent storage
- Vote Smart / Democracy Works
