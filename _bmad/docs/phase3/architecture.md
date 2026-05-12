# Architecture: Phase 3 — Real Ballot Data Integration

## New Files

### `src/app/api/civic/route.ts`
- Next.js App Router API route (server-side)
- Accepts `?zip=` query param
- Calls Google Civic `voterInfoByAddress` + `representativeInfoByAddress`
- Returns unified `LiveElectionData` shape
- In-memory cache (module-level Map, 1hr TTL)
- 10-second timeout via AbortSignal
- Error handling: returns partial data + errors array on failure

### `src/app/api/candidate-detail/route.ts`
- Next.js App Router API route (server-side)
- Accepts `candidateName`, `office`, `state` in POST body
- Calls Anthropic SDK with `web_search` tool enabled
- Returns structured summary: votingRecord, topDonors, endorsements, citations[]
- 30-second timeout for web_search

### `src/lib/electionData.ts`
- Client-facing data access module
- `fetchElectionData(zipCode: string): Promise<LiveElectionData>` — calls `/api/civic`
- `fetchCandidateDetail(candidate: CandidateRef): Promise<CandidateDetail>` — calls `/api/candidate-detail`
- No direct external API calls (all proxied through API routes)

### `src/lib/voterIdData.ts`
- Loads voter ID JSON for a given state code
- `getVoterIdInfo(stateCode: string): VoterIdInfo | null`
- Falls back to null if state file not found

### `src/data/voter-id/` (directory)
- 51 JSON files: one per state + DC (e.g., `TX.json`, `CA.json`, `DC.json`)
- Schema: `{ state, voterIdRequired, idType, acceptedIds[], exceptions, provisionalBallot, provisionalBallotRules, phonesAtPolls, phonesAtPollsDetail, sourceUrl, lastVerified }`

### `src/components/BallotContests.tsx`
- Renders ballot races + candidates
- `data-testid="ballot-contests"`
- Each candidate has "View voting record" button triggering expansion
- Candidate detail panel: `data-testid="candidate-detail"`
- Uses `data-testid="data-loading"` skeleton while fetching

### `src/components/PollingLocation.tsx`
- Renders polling place address
- `data-testid="polling-location"`
- Skeleton while loading

### `src/components/ApiErrorBanner.tsx`
- Partial failure: `data-testid="api-partial-error"`
- Full failure: `data-testid="api-full-error"`
- Non-alarming copy with link to state election office

### `src/components/DataAttribution.tsx`
- `data-testid="data-attribution"`
- Shows "Election data from Google Civic and live web search via Anthropic"
- Shows `Updated [timestamp]`

## Modified Files

### `src/lib/types.ts`
- Add `LiveElectionData`, `BallotContest`, `Candidate`, `VoterIdInfo`, `PollingLocation`, `PartialError` interfaces
- Existing `StateData` unchanged (additive)

### `src/lib/translations.ts`
- Add new keys: `pollingLocationHeading`, `ballotContestsHeading`, `viewVotingRecord`, `candidateLoading`, `electionDataLoading`, `apiPartialError`, `apiFullError`, `dataAttribution`, `dataUpdated`, `voterIdVerifyNote`
- Both `en` and `es` translations required

### `src/components/StateInfo.tsx`
- Add `BallotContests`, `PollingLocation`, `DataAttribution` sections
- Show `ApiErrorBanner` when errors present in `LiveElectionData`
- Pass `liveData?: LiveElectionData` prop (optional — preserves Phase 1-2 static rendering)

### `src/components/ZipForm.tsx`
- Already has `isLoading` prop — no change needed

### `src/app/page.tsx`
- Call `fetchElectionData(zip)` when zip submitted
- Pass `liveData` to `StateInfo`
- Handle loading state

### `.env.example`
- New file documenting required env vars with placeholders

### `e2e/ballot-tool.spec.ts`
- Add Phase 3 tests using `page.route()` mocks for `/api/civic` and `/api/candidate-detail`
- Tests: loading states, partial failure, full failure, candidate expansion, cache (second lookup)

## Data Flow

```
User enters zip code
  → page.tsx setLoading(true), fetchElectionData(zip)
    → GET /api/civic?zip=12345
      → Google Civic API (server-side, with key)
      → Returns LiveElectionData + voterIdInfo (from static JSON)
      → Cached in module-level Map
  → setLiveData(result), setLoading(false)
  → StateInfo renders with stateData (static) + liveData (live)
    → PollingLocation renders if liveData.pollingLocation present
    → BallotContests renders if liveData.ballotContests present
    → ApiErrorBanner renders if liveData.errors?.length > 0
    → DataAttribution renders with liveData.fetchedAt

User clicks "View voting record" on candidate
  → POST /api/candidate-detail {candidateName, office, state}
    → Anthropic API with web_search tool
    → Returns CandidateDetail
  → CandidateDetail panel expands inline
```

## Caching Strategy

```typescript
// In /api/civic/route.ts (module scope, lives for server process lifetime)
const cache = new Map<string, { data: LiveElectionData; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Before fetching:
const cached = cache.get(zip);
if (cached && Date.now() < cached.expiresAt) return cached.data;

// After fetching:
cache.set(zip, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
```

## Error Handling

- Per-source timeout: 10 seconds (AbortController)
- On timeout/error for a source: add to `errors[]` array, continue with other sources
- Response always returns (never throws to client): `{ ...partialData, errors: [...] }`
- Client checks `errors.length > 0` → shows `ApiErrorBanner`
- All errors logged to server-side console only

## Security

- `GOOGLE_CIVIC_API_KEY`, `ANTHROPIC_VOTER_API` used only in API route handlers
- No `NEXT_PUBLIC_` prefix on any API key variables
- Client bundle contains zero API key references
