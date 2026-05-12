# Phase 6 PRD — Issue Ranking, Concern Disambiguation, Polis Overlay

## Goals
1. Issue Ranking UX with drag-and-drop (dnd-kit) and keyboard accessibility
2. Concern disambiguation via Anthropic API with user confirmation
3. Anonymous county-level aggregate counters with Polis overlay

## Stories

### Epic 1: Issue Ranking
- Story 1.1: Create `src/lib/canonicalIssues.ts` with frozen 12-issue taxonomy
- Story 1.2: Create `IssueRanking` component with dnd-kit drag-and-drop
- Story 1.3: Wire ranking output (RankedIssues) into chat system prompt preamble
- Story 1.4: Wire ranking output into copy-paste context block

### Epic 2: Concern Disambiguation
- Story 2.1: Create `/api/disambiguate-concerns` route
- Story 2.2: Create `ConcernDisambiguation` component with free-text + confirmation UI
- Story 2.3: Wire confirmed concerns into chat system prompt and copy-paste block

### Epic 3: Polis Overlay
- Story 3.1: Create `/api/issue-counts/increment` and `/api/issue-counts` routes
- Story 3.2: Create `PolisOverlay` component for per-issue stat display
- Story 3.3: Integrate overlay into IssueRanking component

## Acceptance Criteria
Per PHASE6_SPEC.md:
- All required data-testid attributes present
- Keyboard accessibility with aria-live
- No PII stored server-side
- Graceful degradation when Upstash absent
- Top-3 issues in chat system prompt
- Top-3 issues in copy-paste context block
