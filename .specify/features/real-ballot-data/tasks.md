# Tasks: Real Ballot Data Integration

**Feature**: real-ballot-data
**Generated**: 2026-05-12
**Total Tasks**: 35
**Status**: Ready for implementation

---

## Phase 1: Setup — Types and API Routes

- [x] T001 Create src/types/liveElection.ts with LiveElectionData, BallotContest, Candidate, VoterIdData, PollingLocation, Districts, ApiError interfaces
- [x] T002 [P] Create src/lib/civicApi.ts — Google Civic Information API client (server-side, 10s timeout, maps response to internal types)
- [x] T003 [P] Create src/lib/anthropicEnrich.ts — Anthropic SDK candidate enrichment using web_search tool (server-side)
- [x] T004 Create src/app/api/civic/route.ts — GET /api/civic?zip=XXXXX route handler proxying civicApi
- [x] T005 Create src/app/api/candidate/route.ts — POST /api/candidate route handler proxying anthropicEnrich

## Phase 2: Foundational — Voter ID Static Data

- [x] T006 Create src/data/voter-id/ directory and generate voter ID JSON for all 50 states + DC following the schema in spec.md (state, voterIdRequired, idType, acceptedIds, exceptions, provisionalBallot, provisionalBallotRules, phonesAtPolls, phonesAtPollsDetail, sourceUrl, lastVerified fields)
- [x] T007 Create src/lib/voterIdData.ts — module that loads voter ID JSON for a given state code

## Phase 3: Data Access Layer [US1, US4, US6]

- [x] T008 [US1] [US4] [US6] Create src/lib/dataAccess.ts — unified data access layer with:
  - fetchLiveData(zip): calls /api/civic, loads voterIdData, returns LiveElectionData
  - Session cache: module-level Map<string, {data, fetchedAt}> with 1-hour TTL
  - Error handling: catches API failures, returns partial data + ApiError[] array
- [x] T009 [US1] [US4] Create src/lib/__tests__/dataAccess.test.ts — unit tests: cache hit, cache miss, partial API failure, full failure fallback

## Phase 4: UI Components [US1, US2, US3, US4]

- [x] T010 [P] [US3] Create src/components/SkeletonSection.tsx — skeleton loading placeholder with data-testid="data-loading", accepts label prop
- [x] T011 [P] [US1] Create src/components/PollingLocation.tsx — displays polling place info with data-testid="polling-location"
- [x] T012 [P] [US1] [US2] Create src/components/BallotContests.tsx — displays list of ballot contests, each contest shows candidates list, integrates CandidateDetailPanel
- [x] T013 [P] [US2] Create src/components/CandidateDetailPanel.tsx — expandable panel with data-testid="candidate-detail", fetches from /api/candidate on expand, shows voting record/donors/endorsements
- [x] T014 [P] [US4] Create src/components/ApiErrorBanner.tsx — partial error (data-testid="api-partial-error") and full error (data-testid="api-full-error") banners
- [x] T015 [P] [US1] Create src/components/DataAttribution.tsx — footer with data-testid="data-attribution", shows source attribution + last updated timestamp

## Phase 5: Integration [US1, US2, US3, US4, US5, US6]

- [x] T016 [US1] [US3] [US6] Update src/components/BallotTool.tsx:
  - Replace static state loader with dataAccess.fetchLiveData(zip)
  - Manage civicLoading / civicError state
  - Pass LiveElectionData to StateInfoCard
  - Keep existing error/not-found/select-state flow intact
- [x] T017 [US1] [US3] Update src/components/StateInfoCard.tsx:
  - Add PollingLocation section (below election info, shown when pollingLocation present)
  - Add BallotContests section (when ballotContests present)
  - Add DataAttribution footer
  - Show SkeletonSection for each section while loading
  - Add ApiErrorBanner when apiErrors present
- [x] T018 [US1] Update src/lib/promptBuilder.ts — extend buildContextBlock to include:
  - Districts (county, congressional, state senate, state house)
  - Ballot contests list (race names + candidate names)
  - Polling location
  - Enriched voter ID from VoterIdData
- [x] T019 [P] Update src/lib/i18n/translations.en.ts — add Phase 3 keys:
  - liveData.pollingLocation, liveData.ballotContests, liveData.candidateDetail.*
  - liveData.loading, liveData.attribution, liveData.lastUpdated
  - errors.apiPartial, errors.apiFull
- [x] T020 [P] Update src/lib/i18n/translations.es.ts — Spanish translations for all Phase 3 keys

## Phase 6: Tests [US1, US2, US3, US4, US6]

- [x] T021 [US1] Add e2e test: "displays polling location after valid zip (73301)" in e2e/ballot-tool.spec.ts — checks data-testid="polling-location" visible (mocked API)
- [x] T022 [US1] Add e2e test: "displays ballot contests after valid zip (73301)" — checks data-testid="ballot-contests" visible
- [x] T023 [US1] Add e2e test: "data attribution footer is visible after valid zip" — checks data-testid="data-attribution"
- [x] T024 [US3] Add e2e test: "shows loading skeleton while data loads" — uses route mock with artificial delay, checks data-testid="data-loading"
- [x] T025 [US4] Add e2e test: "shows partial error banner when civic API fails" — mocks /api/civic to return error, checks data-testid="api-partial-error"
- [x] T026 [US4] Add e2e test: "shows full error fallback when all APIs fail" — mocks all API routes as error, checks data-testid="api-full-error"
- [x] T027 [US2] Add e2e test: "can expand candidate detail panel" — clicks candidate, checks data-testid="candidate-detail"
- [x] T028 [US6] Add e2e test: "second lookup for same zip uses cache (no loading state)" — submits zip twice, second time no loading skeleton appears

## Phase 7: Polish

- [x] T029 Add unit tests in src/lib/__tests__/civicApi.test.ts — tests for civicApi response parsing, timeout handling (mock fetch)
- [x] T030 Add unit tests in src/lib/__tests__/promptBuilder.test.ts — update existing tests to cover Phase 3 enriched context block
- [x] T031 Verify .env.example has all 4 required variables documented (already done in Phase 2; verify only)
- [x] T032 Verify TypeScript: run npx tsc --noEmit and fix any type errors
- [x] T033 Run npm run lint and fix any ESLint errors
- [x] T034 Run npx vitest run and fix any unit test failures
- [x] T035 Run npx playwright test and fix any e2e failures

---

## Dependencies

- T004 depends on T002 (civicApi.ts must exist before route.ts)
- T005 depends on T003 (anthropicEnrich.ts must exist before route.ts)
- T008 depends on T004, T007 (dataAccess calls /api/civic and voterIdData)
- T016 depends on T008 (BallotTool uses dataAccess)
- T017 depends on T011, T012, T013, T014, T015 (StateInfoCard uses new components)
- T012 depends on T013 (BallotContests uses CandidateDetailPanel)
- T021-T028 depend on T016, T017 (e2e tests require integrated UI)

## Parallel Opportunities

- T002, T003 can run in parallel (independent API clients)
- T010-T015 can all run in parallel (independent UI components)
- T019, T020 can run in parallel (EN and ES translations)
- T029, T030 can run in parallel (independent test files)
