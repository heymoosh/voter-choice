# Phase 3: Real Ballot Data Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static JSON stubs with server-side data layer using Google Civic API + Anthropic web_search, with caching, loading states, error handling, and i18n.

**Architecture:** Next.js API routes proxy external APIs server-side. Client fetches from `/api/ballot-data`. E2E_MOCK_APIS=1 gates fixture mode for deterministic e2e tests.

**Tech Stack:** Next.js 15.5.12, TypeScript, Google Civic API, Anthropic API (web_search), Vitest, Playwright

---

## Chunk 1: Types + Static Data

### Task 1: Extend TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] Add `BallotData`, `PollingLocation`, `BallotContest`, `BallotCandidate`, `VoterIdData` types
- [ ] Add `DataStatus` union for loading/error/success states
- [ ] Run: `npx tsc --noEmit` — expect no errors (0 new type errors)
- [ ] Commit: `git commit -m "phase3: extend types for BallotData, PollingLocation, BallotContest"`

### Task 2: Voter ID static JSON (10 states)

**Files:**
- Create: `src/data/voter-id/TX.json`, `CA.json`, `NH.json`, `AZ.json`, `NM.json`, `FL.json`, `NY.json`, `GA.json`, `PA.json`, `MI.json`

- [ ] Create voter ID JSON files for TX, CA, NH, AZ, NM, FL, NY, GA, PA, MI following schema in PHASE3_SPEC.md
- [ ] Commit: `git commit -m "phase3: add voter ID static JSON (10 states)"`

---

## Chunk 2: Server-Side Data Layer

### Task 3: Google Civic API client

**Files:**
- Create: `src/lib/server/civicClient.ts`
- Create: `src/lib/server/__tests__/civicClient.test.ts`

- [ ] Write failing test: civicClient returns null on HTTP error
- [ ] Implement `fetchCivicData(zip: string): Promise<CivicResult | null>` with 10s timeout, AbortController
- [ ] Write test: civicClient normalizes Civic API response to `BallotData` shape
- [ ] Implement normalization
- [ ] Run: `npx vitest run src/lib/server/__tests__/civicClient.test.ts`
- [ ] Commit: `git commit -m "phase3: add Google Civic API client with timeout + normalization"`

### Task 4: In-memory cache

**Files:**
- Create: `src/lib/server/dataCache.ts`
- Create: `src/lib/server/__tests__/dataCache.test.ts`

- [ ] Write failing test: cache returns null for unseen key
- [ ] Implement `DataCache` class with `get(key)`, `set(key, value)`, 1-hour TTL
- [ ] Write test: cache returns cached value within TTL
- [ ] Write test: cache returns null after TTL
- [ ] Run: `npx vitest run src/lib/server/__tests__/dataCache.test.ts`
- [ ] Commit: `git commit -m "phase3: add in-memory DataCache with 1-hour TTL"`

### Task 5: Voter ID loader

**Files:**
- Create: `src/lib/server/voterIdData.ts`

- [ ] Implement `getVoterIdData(stateCode: string): VoterIdData | null`
- [ ] Returns null for unsupported states (graceful degradation)
- [ ] Commit: `git commit -m "phase3: add voter ID static data loader"`

### Task 6: Mock fixtures for E2E

**Files:**
- Create: `src/lib/server/mockFixtures.ts`

- [ ] Create fixture `BallotData` for TX (73301), CA (90210), NH (03031), AZ/NM (86515)
- [ ] Fixtures must satisfy all e2e test assertions (state name, election fields, etc.)
- [ ] Commit: `git commit -m "phase3: add mock fixtures for E2E_MOCK_APIS mode"`

### Task 7: /api/ballot-data route

**Files:**
- Create: `src/app/api/ballot-data/route.ts`

- [ ] Implement GET handler: reads `zip` param, checks cache, calls civicClient, merges voter ID
- [ ] When `E2E_MOCK_APIS=1`: return fixture data immediately
- [ ] Partial failure: return available data + `errors` array
- [ ] Full failure: return static voter ID + `apiFullError: true`
- [ ] Commit: `git commit -m "phase3: add /api/ballot-data route with caching + error handling"`

### Task 8: /api/candidate-enrich route

**Files:**
- Create: `src/app/api/candidate-enrich/route.ts`

- [ ] Implement POST handler: accepts `{ name, race, state }`, calls Anthropic with web_search tool
- [ ] When `E2E_MOCK_APIS=1`: return mock enrichment data
- [ ] Return `{ votingRecord, topDonors, endorsements, citations }`
- [ ] Commit: `git commit -m "phase3: add /api/candidate-enrich route (Anthropic web_search)"`

---

## Chunk 3: UI Updates

### Task 9: Update page.tsx for async data fetching

**Files:**
- Modify: `src/app/page.tsx`

- [ ] Replace synchronous `resolveState` with async fetch to `/api/ballot-data`
- [ ] Add loading state: `{ status: "loading"; zip: string }` to PageState union
- [ ] Show `data-testid="data-loading"` spinner during fetch
- [ ] Handle partial/full error states from API response
- [ ] Commit: `git commit -m "phase3: async data fetching + loading state in page.tsx"`

### Task 10: Update ZipForm for loading state

**Files:**
- Modify: `src/components/ZipForm.tsx`

- [ ] Accept `isLoading?: boolean` prop
- [ ] Show spinner on submit button when loading
- [ ] Disable input during loading
- [ ] Commit: `git commit -m "phase3: add loading spinner to ZipForm submit button"`

### Task 11: Update StateInfoCard

**Files:**
- Modify: `src/components/StateInfoCard.tsx`

- [ ] Add `data-testid="polling-location"` section (from BallotData)
- [ ] Add `data-testid="ballot-contests"` section with contest list
- [ ] Add `data-testid="candidate-detail"` expandable panel (collapsed by default)
- [ ] Add `data-testid="data-attribution"` footer
- [ ] Commit: `git commit -m "phase3: add polling-location, ballot-contests, candidate-detail to StateInfoCard"`

### Task 12: Error state banners

**Files:**
- Modify: `src/app/page.tsx` (or extract ErrorBanner component)

- [ ] Add `data-testid="api-partial-error"` warning banner
- [ ] Add `data-testid="api-full-error"` fallback banner
- [ ] Commit: `git commit -m "phase3: add api-partial-error and api-full-error banners"`

### Task 13: Update generatePrompt for enriched data

**Files:**
- Modify: `src/lib/generatePrompt.ts`

- [ ] Accept optional `ballotData?: BallotData` param
- [ ] When provided: include districts, ballot contests, polling location in context block
- [ ] Remain backward-compatible (BallotData undefined → same as Phase 2)
- [ ] Update unit tests
- [ ] Commit: `git commit -m "phase3: enrich generatePrompt with districts + ballot contests"`

### Task 14: i18n — add Phase 3 translation keys

**Files:**
- Modify: `src/lib/i18n/translations.ts`

- [ ] Add EN + ES keys: `loadingElectionData`, `pollingLocation`, `ballotContests`, `candidateDetail`, `viewVotingRecord`, `apiPartialError`, `apiFullError`, `dataAttribution`, `lastUpdated`, `topDonors`, `endorsements`
- [ ] Run: `npx vitest run src/lib/__tests__/i18n.test.ts`
- [ ] Commit: `git commit -m "phase3: add Phase 3 i18n keys (EN + ES)"`

---

## Chunk 4: Test Infrastructure + E2E Tests

### Task 15: Configure E2E_MOCK_APIS in playwright.config.ts

**Files:**
- Modify: `playwright.config.ts`

- [ ] Add `env: { E2E_MOCK_APIS: '1' }` to webServer config
- [ ] Commit: `git commit -m "phase3: set E2E_MOCK_APIS=1 in playwright webServer config"`

### Task 16: .env.example

**Files:**
- Create: `.env.example`

- [ ] Document all env vars per PHASE3_SPEC.md table
- [ ] Commit: `git commit -m "phase3: add .env.example with all required env vars"`

### Task 17: New Phase 3 e2e tests

**Files:**
- Create: `e2e/phase3-ballot-data.spec.ts`

- [ ] Test: loading state appears (`data-testid="data-loading"`)
- [ ] Test: ballot-contests section visible after submit
- [ ] Test: polling-location section visible
- [ ] Test: data-attribution footer present
- [ ] Test: api-partial-error (via mock fixture's error flag if needed)
- [ ] Test: candidate-detail panel expands on click
- [ ] Run: `npx playwright test e2e/phase3-ballot-data.spec.ts`
- [ ] Commit: `git commit -m "phase3: add Phase 3 e2e tests"`

---

## Final

- [ ] Run: `npm run lint` — expect 0 errors
- [ ] Run: `npx vitest run` — all tests pass
- [ ] Run: `npx playwright test` — all tests pass (existing + new)
