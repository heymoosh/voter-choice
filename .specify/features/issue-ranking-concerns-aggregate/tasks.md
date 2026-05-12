# Tasks: Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters

**Feature:** issue-ranking-concerns-aggregate
**Phase:** 6
**Generated:** 2026-05-12

---

## Phase 1: Setup

- [X] T001 Install @dnd-kit/core and @dnd-kit/sortable in package.json
- [X] T002 Create src/lib/canonicalIssues.ts with frozen 12-issue taxonomy

## Phase 2: Foundational Types and Utilities

- [X] T003 Create src/lib/issueRanking.ts with RankedIssues type and helpers
- [X] T004 Create src/lib/confirmedConcerns.ts with ConfirmedConcerns type and helpers
- [X] T005 [P] Create src/lib/upstashClient.ts with HTTP REST client and graceful degradation

## Phase 3: User Story 1 — Issue Ranking UI

- [X] T006 [US1] Create src/components/IssueRankingList.tsx with drag-and-drop using @dnd-kit
- [X] T007 [US1] Add keyboard accessibility (arrow keys + space) and aria-live announcements to IssueRankingList
- [X] T008 [US1] Add issue-ranking-list, issue-rank-item-<slug>, issue-rank-skip-button, issue-rank-confirm-button data-testid attributes
- [X] T009 [US1] Add unit tests for issueRanking helpers in src/lib/__tests__/issueRanking.test.ts

## Phase 4: User Story 2 — Concern Disambiguation

- [X] T010 [US2] Create src/app/api/disambiguate-concerns/route.ts with Claude Sonnet mapping
- [X] T011 [US2] Create src/components/ConcernDisambiguation.tsx with free-text input and confirmation panel
- [X] T012 [US2] Add concern-disambiguation-input, concern-disambiguation-submit, concern-mapping-confirmation, concern-mapping-issue-<slug>, concern-confirm-button data-testid attributes
- [X] T013 [US2] Add unit tests for concern helpers in src/lib/__tests__/confirmedConcerns.test.ts

## Phase 5: User Story 3 — Aggregate Counters and Polis Overlay

- [X] T014 [US3] Create src/app/api/issue-counts/route.ts for GET aggregate counts
- [X] T015 [US3] Create src/app/api/issue-counts/increment/route.ts for POST increment
- [X] T016 [US3] Create src/components/PolisOverlay.tsx with bar visualization and privacy disclosure
- [X] T017 [US3] Add issue-count-bar-<slug>, issue-count-value-<slug>, issue-count-county-label data-testid attributes
- [X] T018 [US3] Add unit tests for upstash client in src/lib/__tests__/upstashClient.test.ts

## Phase 6: Integration

- [X] T019 Update src/components/BallotTool.tsx to integrate IssueRankingList + ConcernDisambiguation before chat CTA
- [X] T020 Update src/lib/promptBuilder.ts to embed ranked issues and confirmed concerns in buildSystemPrompt
- [X] T021 Update src/lib/promptBuilder.ts to embed structured blocks in buildPrompt (copy-paste path)
- [X] T022 Add i18n keys for all new Phase 6 UI text in src/lib/i18n/ locale files

## Phase 7: Polish and Validation

- [X] T023 Verify all required data-testid attributes are present across all new components
- [X] T024 [P] Update promptBuilder unit tests for ranked issues and concern integration
- [X] T025 Run npm run lint and fix all errors
