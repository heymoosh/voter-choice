---
title: "feat: Real Ballot Data Integration (Phase 3)"
type: feat
status: active
date: 2026-05-12
---

# Real Ballot Data Integration — Phase 3

## Overview

Replace the 2-3 state static JSON stubs with a live data layer that fetches real election information from free public APIs. A user entering any U.S. zip code gets accurate, current election information — not stub data.

Architecture focus: multi-source aggregation, caching, error handling, loading states, and fallback behavior. Data-access layer abstracted so UI components are source-agnostic.

## Problem Statement

Phase 2 app uses only 3 static JSON files (TX, CA, NH) for state data. Any zip code that doesn't map to those three states returns "zip not found." Phase 3 replaces this with:

1. Google Civic Information API — polling locations, election dates, ballot contests, candidate info
2. Anthropic `web_search` — candidate enrichment (voting records, donors, endorsements)
3. Static voter ID JSON — gap coverage for all 50 states + DC (no free API covers this)

## Technical Approach

### Files to Create / Modify

**New files:**
- `src/lib/civic/client.ts` — Google Civic API client (server-side only)
- `src/lib/civic/types.ts` — TypeScript types for Civic API responses
- `src/lib/civic/cache.ts` — In-memory session cache (per-zip, 1hr TTL)
- `src/lib/civic/mapper.ts` — Maps Civic API response → app's unified data model
- `src/lib/enrichment/candidateEnrichment.ts` — Anthropic web_search candidate research
- `src/lib/enrichment/types.ts` — Types for enrichment data (voting records, donors, endorsements)
- `src/lib/dataLayer.ts` — Unified data access layer (composes Civic + enrichment + static JSON)
- `src/app/api/election/[zip]/route.ts` — API route: zip → election data (proxies to Civic)
- `src/app/api/candidate/[id]/route.ts` — API route: candidate enrichment via Anthropic
- `src/data/voter-id/` — Static voter ID JSON for all 50 states + DC
- `src/components/BallotContests.tsx` — Ballot contests + candidates section
- `src/components/CandidateDetail.tsx` — Expandable candidate panel with enrichment
- `src/components/PollingLocation.tsx` — Polling location display
- `src/components/DataAttribution.tsx` — Attribution footer
- `src/components/LoadingSkeleton.tsx` — Skeleton loading states
- `src/components/ApiErrorBanner.tsx` — Partial / full API error states
- `.env.example` — Document all env vars

**Modified files:**
- `src/types/state.ts` — Add new fields (pollingLocation, ballotContests, etc.)
- `src/lib/stateRegistry.ts` — Extend to support live data lookup via API
- `src/lib/promptBuilder.ts` — Enriched prompt with districts, contests, polling place
- `src/app/page.tsx` — Add new sections, loading states, progressive display
- `src/lib/i18n/translations.ts` — Add new translation keys (EN + ES)
- `src/lib/i18n/prompts.ts` — Update prompt builder with Phase 3 context

### Data Access Pattern

```
zip → /api/election/[zip] → civic client → mapper → unified model
                          ↘ cache (per zip, 1hr TTL)
                          ↘ voter-id static JSON (fallback always works)
```

Candidate expand → /api/candidate/[id] → Anthropic web_search → structured summary

### Caching Strategy
- Server-side in-memory Map, keyed by zip
- TTL: 1 hour
- Second hit for same zip is cache-served (no loading state)

### Error Handling
1. Partial failure: show available data + `api-partial-error` banner
2. Full failure: show static voter-ID JSON + `api-full-error` banner
3. Timeout: 10s per source, treated as partial failure
4. Never crash, never blank page

## Acceptance Criteria

- [ ] User enters a real zip code and sees real election data from Google Civic
- [ ] Voter ID requirements display from static JSON for any state
- [ ] API keys are server-side only — never in client bundle
- [ ] `.env.example` documents all env vars with placeholders
- [ ] Loading states appear during fetch (`data-loading` testid)
- [ ] Progressive loading: each section appears as data arrives
- [ ] If Civic fails → other data shows + `api-partial-error` banner
- [ ] If all APIs fail → static fallback + `api-full-error` banner
- [ ] 10-second timeout doesn't crash app
- [ ] Prompt includes districts, ballot contests, polling place
- [ ] All new UI text in English and Spanish
- [ ] `polling-location`, `ballot-contests`, `candidate-detail`, `data-loading`, `api-partial-error`, `api-full-error`, `data-attribution` testids present
- [ ] Cache prevents redundant API calls for same zip within session
- [ ] E2e tests cover: loading states, partial failure, full failure fallback, candidate expansion
- [ ] Existing Phase 1-2 e2e tests still pass (no regressions)

## Implementation Phases

### Phase A: Data Layer Foundation
1. TypeScript types for Civic API responses and enrichment
2. Google Civic client with 10s timeout
3. In-memory cache
4. Mapper to unified model
5. API route `/api/election/[zip]`
6. Static voter-ID JSON (major states first, fallback for rest)
7. `.env.example`

### Phase B: Candidate Enrichment
1. Anthropic client (server-side, web_search enabled)
2. API route `/api/candidate/[id]`
3. CandidateDetail component with expand/collapse

### Phase C: UI Integration
1. PollingLocation component
2. BallotContests component
3. LoadingSkeleton component
4. ApiErrorBanner component
5. DataAttribution component
6. Update page.tsx with progressive loading

### Phase D: i18n + Prompt
1. Add all new translation keys (EN + ES)
2. Update promptBuilder with Phase 3 fields

### Phase E: Tests
1. Vitest unit tests for data layer (mocked Civic)
2. New Playwright e2e tests for Phase 3 scenarios
3. Verify existing tests still pass

## Sources & References

- `docs/PHASE3_SPEC.md` — authoritative spec
- `src/types/state.ts` — existing type model to extend
- `src/lib/stateRegistry.ts` — existing data loader
- `src/lib/promptBuilder.ts` — existing prompt builder
- `src/lib/i18n/translations.ts` — existing i18n pattern
- `e2e/ballot-tool.spec.ts` — existing e2e tests (must not regress)
