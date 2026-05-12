---
title: "feat: Phase 6 — Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters"
type: feat
status: active
date: 2026-05-12
---

# Phase 6: Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters

## Overview

Add three intertwined features to the voter-choice app:
1. **Issue Ranking UX** — Drag-and-rank (keyboard-accessible) for 12 canonical issues
2. **Concern Disambiguation** — Free-text concern → canonical issue mapping via Claude, with user confirmation
3. **Anonymous Aggregate Counters + Polis Overlay** — County-level anonymous counts shown as inline bars on each issue card

All three feed into Phase 5's chat system prompt and copy-paste context block.

## Source of Truth

`docs/PHASE6_SPEC.md`

## Technical Approach

### Feature 1: Issue Ranking

**Implementation:** Custom keyboard-first sortable list (no @dnd-kit dependency — justified: keyboard-only requirement is primary accessibility criterion; custom implementation uses arrow keys + space + aria-live; mouse drag also supported via drag-handle attributes. Simpler e2e testing. Spec allows substitution with justification.)

**New file:** `src/lib/canonicalIssues.ts` — frozen list of 12 canonical issues

**New component:** `src/components/IssueRanking.tsx`
- `data-testid="issue-ranking-list"` on sortable container
- `data-testid="issue-rank-item-{slug}"` on each item
- `data-testid="issue-rank-skip-button"` on skip CTA
- `data-testid="issue-rank-confirm-button"` on confirm CTA
- Emits `RankedIssues` type `{ordered: string[], skipped: boolean, timestamp: string}`
- No localStorage/sessionStorage/cookie persistence
- Top-3 propagates to chat system prompt + copy-paste context block

**Type:** `src/lib/canonicalIssues.ts` exports `RankedIssues`, `ConfirmedConcerns` types

### Feature 2: Concern Disambiguation

**New component:** `src/components/ConcernDisambiguation.tsx`
- `data-testid="concern-disambiguation-input"` on free-text field
- `data-testid="concern-disambiguation-submit"` on submit
- `data-testid="concern-mapping-confirmation"` on confirmation panel
- `data-testid="concern-mapping-issue-{slug}"` on each checkbox
- `data-testid="concern-confirm-button"` on final confirm
- Emits `ConfirmedConcerns` type

**New API route:** `src/app/api/disambiguate-concerns/route.ts`
- `POST /api/disambiguate-concerns` → calls Claude Sonnet
- Mock mode when `ANTHROPIC_API_KEY` is absent or "test"
- No server-side logging of concern text
- Same rate-limit budget as chat
- Prompt injection protections

### Feature 3: Anonymous Aggregate Counters + Polis Overlay

**New component:** `src/components/PolisOverlay.tsx`
- `data-testid="issue-count-bar-{slug}"` on bar
- `data-testid="issue-count-value-{slug}"` on percentage
- `data-testid="issue-count-county-label"` on county caption
- Gracefully degrades when Upstash env vars missing

**New API routes:**
- `POST /api/issue-counts/increment` — increments county+issue counter
- `GET /api/issue-counts?countyFips=...` — returns all counts for county

**Storage:** Upstash Redis via HTTP API (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)
**Key format:** `count:<county_fips>:<issue_slug>`

**Deduplication:** Short-lived signed token (session-scoped) prevents double-increment

### Integration

**`src/lib/promptBuilder.ts`:** Add `buildVoterValuesBlock()` function that accepts `RankedIssues` and `ConfirmedConcerns` and injects into prompt

**`src/app/page.tsx`:** Wire `IssueRanking` → `ConcernDisambiguation` → feed into `ChatWindow` + copy-paste prompt

**`src/lib/i18n/translations.ts`:** Add Phase 6 labels in all 5 languages

### Score Measurement Plumbing

**`scoring/measure.mjs`:** Replace `npx next build` with `npm run build` (3 occurrences) to use project's `--turbo` flag and avoid Node 22 WasmHash bug.

## Acceptance Criteria

### Feature 1 — Issue Ranking
- [ ] `src/lib/canonicalIssues.ts` exports frozen list of 12 issues + `RankedIssues` type
- [ ] `IssueRanking` component renders 12 issues with correct data-testids
- [ ] Keyboard reordering works (arrow keys + space)
- [ ] `aria-live` announces order changes
- [ ] Skip and confirm CTAs present with correct data-testids
- [ ] Top-3 appears in chat system prompt and copy-paste block
- [ ] No client-side persistence (no localStorage/sessionStorage)

### Feature 2 — Concern Disambiguation
- [ ] `/api/disambiguate-concerns` responds in mock mode
- [ ] `ConcernDisambiguation` component renders with correct data-testids
- [ ] User can edit AI mapping before confirming
- [ ] Confirmed concerns appear in chat system prompt
- [ ] Confirmed concerns appear as structured blocks in copy-paste

### Feature 3 — Polis Overlay
- [ ] `POST /api/issue-counts/increment` succeeds (or gracefully skips if no Upstash)
- [ ] `GET /api/issue-counts` returns `{countyFips, issueCounts}` shape
- [ ] `PolisOverlay` renders with correct data-testids when county data available
- [ ] App does NOT crash when Upstash env vars missing
- [ ] Privacy disclosure present alongside overlay

## Dependencies

- No new npm packages required for ranking (custom keyboard sort)
- Upstash credentials: optional (graceful degradation required)
- `ANTHROPIC_API_KEY`: reused from Phase 5

## Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Upstash not provisioned | Graceful degradation: overlay hidden, ranking works |
| Disambiguate API in test mode | Mock mode identical to chat mock pattern |
| Drag-and-drop complexity | Keyboard-first implementation; mouse drag secondary |
| i18n completeness | Add all 5 languages in translations.ts |

## Sources

- Phase 6 Spec: `docs/PHASE6_SPEC.md`
- Phase 5 patterns: `src/app/api/chat/route.ts`, `src/components/ChatWindow.tsx`
- Existing i18n: `src/lib/i18n/translations.ts`
- Prompt builder: `src/lib/promptBuilder.ts`
