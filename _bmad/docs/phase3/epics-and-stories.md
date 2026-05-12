# Epics and Stories: Phase 3 — Real Ballot Data Integration

## Epic 1: Data Layer

### Story 1.1: Environment Variable Setup
- Create `.env.example` with GOOGLE_CIVIC_API_KEY, ANTHROPIC_VOTER_API, OPENSTATES_API_KEY (optional), OPENFEC_API_KEY (optional)
- Document each variable with comments
- Verify `.env.local` is in `.gitignore`

### Story 1.2: Voter ID Static JSON (All 50 States + DC)
- Create `src/data/voter-id/` directory
- Create JSON files for all 50 states + DC following schema from PHASE3_SPEC.md
- Create `src/lib/voterIdData.ts` to load by state code

### Story 1.3: TypeScript Type Extensions
- Add `LiveElectionData`, `BallotContest`, `Candidate`, `VoterIdInfo`, `PollingLocation`, `PartialError` to `src/lib/types.ts`

### Story 1.4: Google Civic API Route
- Create `src/app/api/civic/route.ts`
- Server-side proxy to Google Civic API
- 10-second timeout per request
- In-memory caching (1hr TTL)
- Returns unified `LiveElectionData` shape
- Integrates voter ID static JSON into response

### Story 1.5: Anthropic Candidate Detail Route
- Create `src/app/api/candidate-detail/route.ts`
- POST handler accepting `{ candidateName, office, state }`
- Calls Anthropic with web_search tool
- Returns `{ votingRecord, topDonors, endorsements, citations }`
- 30-second timeout

### Story 1.6: Client Data Access Module
- Create `src/lib/electionData.ts`
- `fetchElectionData(zip)` → calls `/api/civic`
- `fetchCandidateDetail(ref)` → calls `/api/candidate-detail`

## Epic 2: UI Updates

### Story 2.1: PollingLocation Component
- `src/components/PollingLocation.tsx`
- `data-testid="polling-location"`
- Skeleton loading state with `data-testid="data-loading"`

### Story 2.2: BallotContests Component
- `src/components/BallotContests.tsx`
- `data-testid="ballot-contests"`
- Candidate list with "View voting record" expansion
- `data-testid="candidate-detail"` on each candidate panel
- Inline expansion with loading state

### Story 2.3: ApiErrorBanner Component
- `src/components/ApiErrorBanner.tsx`
- Props: `type: 'partial' | 'full'`, `stateElectionUrl?: string`
- `data-testid="api-partial-error"` or `data-testid="api-full-error"`

### Story 2.4: DataAttribution Component
- `src/components/DataAttribution.tsx`
- `data-testid="data-attribution"`
- Shows source + timestamp

### Story 2.5: StateInfo Integration
- Add new components to `StateInfo.tsx`
- Accept optional `liveData?: LiveElectionData` prop
- Show `ApiErrorBanner` when errors present

### Story 2.6: Page.tsx Live Data Integration
- Update `src/app/page.tsx`
- Call `fetchElectionData(zip)` on submit
- Progressive state updates
- Pass `liveData` through to `StateInfo`

## Epic 3: i18n Extensions

### Story 3.1: New Translation Keys
- Add to `Translations` interface: `pollingLocationHeading`, `ballotContestsHeading`, `viewVotingRecord`, `candidateLoading`, `electionDataLoading`, `apiPartialError`, `apiFullError`, `dataAttribution`, `dataUpdated`, `voterIdVerifyNote`
- Add English and Spanish translations

## Epic 4: Tests

### Story 4.1: Phase 3 E2e Tests
- Add to `e2e/ballot-tool.spec.ts` (or new `e2e/phase3.spec.ts`)
- Tests using `page.route()` to mock `/api/civic` and `/api/candidate-detail`
- Cover: loading states, partial failure, full failure, candidate expansion, cache

### Story 4.2: Unit Tests for New Modules
- Unit tests for `voterIdData.ts`
- Unit tests for electionData client module
