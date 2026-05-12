# Phase 6 Design: Issue Ranking, Concern Disambiguation & Aggregate Counters

## Context

Adds three features to the existing Phase 5 voter research tool:
1. Drag-and-rank issue prioritization (12 canonical issues)
2. Free-text concern disambiguation via Claude API
3. Anonymous aggregate counters with Polis-style overlay

## Architecture

### New Files
- `src/lib/canonicalIssues.ts` — frozen list of 12 canonical issues + slugs
- `src/lib/issueRanking.ts` — RankedIssues type + helpers
- `src/components/IssueRanking.tsx` — drag-rank UI using @dnd-kit
- `src/components/ConcernDisambiguation.tsx` — free-text + confirmation UI
- `src/components/PolisOverlay.tsx` — aggregate counter bar overlay
- `src/app/api/disambiguate-concerns/route.ts` — Claude mapping API
- `src/app/api/issue-counts/route.ts` — GET aggregate counts
- `src/app/api/issue-counts/increment/route.ts` — POST increment

### Integration Points
- `page.tsx` — adds IssueRanking + ConcernDisambiguation above the Chat CTA
- `chatSystemPrompt.ts` — updated to accept RankedIssues + ConfirmedConcerns
- `generatePrompt.ts` — updated to embed VOTER VALUES + CONCERN_INTERPRETATION blocks
- `src/lib/types.ts` — adds RankedIssues + ConfirmedConcerns types

### Approach
**Option A (chosen):** @dnd-kit/core + @dnd-kit/sortable — spec recommendation, keyboard accessible via KeyboardSensor, widely maintained.
**Option B:** HTML5 drag API — simpler but poor keyboard accessibility, fails spec.
**Option C:** CSS-only reorder — insufficient interactivity.

### Data Flow
1. User sees IssueRanking after ZIP data loads
2. User ranks (drag/keyboard) or skips → produces RankedIssues
3. User enters free-text concern or skips → POST to /api/disambiguate-concerns → returns matched issues
4. User confirms/edits mapped issues → produces ConfirmedConcerns
5. Both objects passed to ChatWindow (system prompt) and PromptOutput (copy-paste blocks)
6. On confirm, POST to /api/issue-counts/increment with county FIPS from BallotData

### Privacy
- IssueRanking + ConfirmedConcerns: no client-side persistence (no localStorage)
- Aggregate counts: county+issue slug only, no PII, Upstash Redis
- Graceful degradation if UPSTASH_REDIS_REST_URL not set

### Testing
- Unit: canonicalIssues, issueRanking helpers, chatSystemPrompt with ranking, generatePrompt with concerns
- E2E: issue-ranking-keyboard flow, concern disambiguation flow, polis overlay visibility
