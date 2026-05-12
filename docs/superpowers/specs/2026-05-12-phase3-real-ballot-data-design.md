# Phase 3: Real Ballot Data Integration — Design Doc

**Date:** 2026-05-12
**Phase:** 3
**Framework:** Superpowers (r1)

---

## Problem Statement

Replace 3-state static JSON stubs with a real data layer that pulls current election data from Google Civic API and enriches candidates via Anthropic web_search. The app must handle loading states, partial/full failures, and caching per session.

---

## Approach Selected

**Server-side proxy API routes** (Next.js API routes) that aggregate data from external APIs and return a unified `BallotData` response shape to client components.

Rejected alternatives:
- Server components fetching directly: harder to mock for e2e tests, loading state harder to manage
- Edge streaming: over-engineered for current scale

---

## Architecture

### New Files

```
src/app/api/ballot-data/route.ts       # Main data aggregation endpoint
src/app/api/candidate-enrich/route.ts  # Lazy candidate enrichment (Anthropic web_search)
src/lib/server/civicClient.ts          # Google Civic API client
src/lib/server/dataCache.ts            # In-memory cache (per session via Map + TTL)
src/lib/server/voterIdData.ts          # Voter ID static JSON loader
src/lib/server/mockFixtures.ts         # Fixture data for E2E_MOCK_APIS=1
src/lib/types.ts                       # Extended with BallotData, PollingLocation, BallotContest, CandidateEnrichment
src/data/voter-id/TX.json              # Voter ID: TX, CA, NH, AZ, NM, FL, NY, GA, PA, MI
... (10 state files)
```

### Modified Files

```
src/app/page.tsx                       # Replace synchronous resolveState with async fetch
src/components/StateInfoCard.tsx       # Add polling-location, ballot-contests, data-attribution
src/components/ZipForm.tsx             # Add loading spinner on submit
src/lib/generatePrompt.ts              # Enrich prompt with districts, ballot contests
src/lib/i18n/translations.ts           # Add Phase 3 translation keys (EN + ES)
playwright.config.ts                   # Add E2E_MOCK_APIS=1 to webServer.env
.env.example                           # Document all required env vars
```

### Test Files

```
src/lib/server/__tests__/civicClient.test.ts
src/lib/server/__tests__/dataCache.test.ts
e2e/phase3-ballot-data.spec.ts         # New Phase 3 e2e tests
```

---

## Data Flow

1. User enters zip → ZipForm calls `/api/ballot-data?zip=73301`
2. API route: checks in-memory cache → if miss, calls Google Civic → merges voter ID static JSON → returns `BallotData`
3. Client renders `StateInfoCard` with live data + loading/error states
4. User expands candidate → client calls `/api/candidate-enrich?name=...&race=...` → Anthropic web_search → streaming response
5. Prompt is generated from enriched BallotData

---

## Error Handling

- Per-source timeout: 10s AbortController
- Partial failure: show available data + `api-partial-error` banner
- Full failure: show static voter ID fallback + `api-full-error` banner
- Never expose API keys to client

---

## Test Strategy

- Vitest unit tests for civicClient, dataCache, voterIdData
- E2e via E2E_MOCK_APIS=1 fixture mode in playwright.config.ts webServer.env
- New e2e tests: loading states, partial/full failure, candidate expand

---

## Scope Cuts (experiment constraints)

- OpenStates/OpenFEC: OPTIONAL per spec, dropped to keep complexity manageable
- Voter ID JSON: covers 10 states (TX, CA, NH, AZ, NM, FL, NY, GA, PA, MI)
- "All 50 states" voter ID is aspirational; unsupported states fall back to state election website link

---

## i18n

All new UI strings added to translations.ts in both English and Spanish, following Phase 2 pattern.
