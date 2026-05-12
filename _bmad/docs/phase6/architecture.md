# Phase 6 Architecture

## New Files

### src/lib/canonicalIssues.ts
- Frozen array of 12 canonical issues with slug + label
- Exported as `CANONICAL_ISSUES` and `RankedIssues` type

### src/components/IssueRanking.tsx
- Uses @dnd-kit/core + @dnd-kit/sortable
- DndContext + SortableContext for drag-and-drop
- KeyboardSensor for keyboard accessibility
- aria-live region for announcements
- Props: onConfirm(ranking: RankedIssues), onSkip()
- data-testid: issue-ranking-list, issue-rank-item-<slug>, issue-rank-skip-button, issue-rank-confirm-button

### src/components/ConcernDisambiguation.tsx  
- Free-text textarea + submit
- Calls /api/disambiguate-concerns
- Shows confirmation panel with editable checkboxes
- Props: onConfirm(concerns: ConfirmedConcerns), onSkip()
- data-testid: concern-disambiguation-input, concern-disambiguation-submit, concern-mapping-confirmation, concern-mapping-issue-<slug>, concern-confirm-button

### src/components/PolisOverlay.tsx
- Renders per-issue count bar
- Props: issueCounts: Record<string, number>, issueSlug: string
- data-testid: issue-count-bar-<slug>, issue-count-value-<slug>, issue-count-county-label

### src/app/api/disambiguate-concerns/route.ts
- POST { text: string }
- Calls Claude Sonnet to map to canonical issues
- Returns { matchedIssues: string[], rationale: string }

### src/app/api/issue-counts/route.ts
- GET ?countyFips=<fips> → returns { countyFips, issueCounts, totalRespondents: null }
- POST (increment) → { countyFips, issueSlug } → increments Redis counter

## Modified Files

### src/lib/types.ts
- Add RankedIssues, ConfirmedConcerns types

### src/components/ChatWindow.tsx
- Accept rankedIssues?: RankedIssues and confirmedConcerns?: ConfirmedConcerns props
- Prepend ranking/concerns preamble to system prompt

### src/components/BallotTool.tsx
- Add IssueRanking step before showing chat
- Add ConcernDisambiguation step
- Pass ranking/concerns to ChatWindow

### src/lib/promptBuilder.ts
- Add ranking/concerns to context block output
