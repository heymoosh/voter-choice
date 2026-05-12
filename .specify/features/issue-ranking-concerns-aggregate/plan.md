# Implementation Plan: Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters

**Feature Name:** issue-ranking-concerns-aggregate
**Phase:** 6
**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, @dnd-kit/core, @dnd-kit/sortable, Upstash Redis
**Created:** 2026-05-12

---

## Technical Context

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **AI API:** Anthropic `claude-sonnet-4-6` (reused from Phase 5)
- **Counter storage:** Upstash Redis HTTP API (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)
- **i18n:** Existing Phase 4 i18n system (`src/lib/i18n/`)
- **Tests:** Vitest (unit), Playwright (e2e)

---

## Constitution Check

- Privacy-first: No PII in storage; aggregate counters only
- No client-side persistence (no localStorage/sessionStorage for ranking/concerns)
- Graceful degradation when Upstash credentials absent
- Prompt injection protection for free-text concern (same rules as Phase 5 voter profile)
- Accessibility: Keyboard-fully-operable drag-rank with aria-live announcements

---

## Architecture

### New Files

```
src/lib/canonicalIssues.ts          — frozen 12-issue taxonomy
src/lib/issueRanking.ts             — RankedIssues type + helpers
src/lib/confirmedConcerns.ts        — ConfirmedConcerns type + helpers
src/lib/upstashClient.ts            — Upstash Redis HTTP client (graceful-degrade)
src/components/IssueRankingList.tsx — drag-and-rank UI component
src/components/ConcernDisambiguation.tsx — free-text + confirmation UI
src/components/PolisOverlay.tsx     — aggregate count bar overlay
src/app/api/disambiguate-concerns/route.ts — Claude-powered disambiguation
src/app/api/issue-counts/route.ts   — GET aggregate counts
src/app/api/issue-counts/increment/route.ts — POST increment
```

### Modified Files

```
src/components/BallotTool.tsx       — integrate ranking + concern flow before chat CTA
src/lib/promptBuilder.ts            — add ranked issues + concerns to system prompt + copy-paste
src/lib/i18n/en.ts (and other locales) — new i18n strings for Phase 6 UI
package.json                        — add @dnd-kit/core, @dnd-kit/sortable
```

---

## Data Model

### RankedIssues
```ts
type RankedIssues = {
  ordered: string[];   // canonical issue keys, top priority first
  skipped: boolean;
  timestamp: string;   // ISO-8601
};
```

### ConfirmedConcerns
```ts
type ConfirmedConcerns = {
  freeText: string | null;
  confirmedIssues: string[];  // canonical keys user checked
  skipped: boolean;
};
```

### Upstash Key Format
- `count:<county_fips>:<issue_slug>` → integer

---

## API Contracts

### POST /api/disambiguate-concerns
Request: `{ concernText: string }`
Response: `{ interpretation: string, matchedIssues: Array<{issue, quote, confidence}>, unmatched: [] }`

### GET /api/issue-counts?countyFips=<fips>
Response: `{ countyFips: string, issueCounts: Record<string, number>, totalRespondents: null }`

### POST /api/issue-counts/increment
Request: `{ issueSlug: string, dedupeToken: string }`
Response: `{ success: boolean }`

---

## Phase 0: Research Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Drag-and-drop library | @dnd-kit/core + @dnd-kit/sortable | Spec mandates it; best-in-class accessibility |
| Redis client | Native Upstash HTTP REST API (no SDK) | Serverless-compatible, zero extra deps |
| County FIPS source | From LiveElectionData.districts (existing) | Already fetched in Phase 3, no new API call |
| Dedupe token | HMAC-SHA256 signed, 1hr expiry, React state only | No PII, no cookies |
| i18n approach | Extend existing Phase 4 i18n keys | Consistent with codebase |

---

## Phase 1: Implementation Phases

### Phase 1 (Setup)
- Install `@dnd-kit/core` + `@dnd-kit/sortable`
- Create `src/lib/canonicalIssues.ts` with frozen 12-issue list

### Phase 2 (Types and Utilities)
- Create `src/lib/issueRanking.ts` (type + helpers)
- Create `src/lib/confirmedConcerns.ts` (type + helpers)
- Create `src/lib/upstashClient.ts` (HTTP client with graceful degrade)

### Phase 3 (US1: Issue Ranking UI)
- Build `IssueRankingList.tsx` with dnd-kit drag-and-rank
- Keyboard accessibility + aria-live
- Skip + confirm CTAs with required testids

### Phase 4 (US2: Concern Disambiguation)
- Build `ConcernDisambiguation.tsx` (free-text input + confirmation panel)
- Build `/api/disambiguate-concerns/route.ts` (Claude Sonnet mapping)

### Phase 5 (US3: Aggregate Counters + Polis Overlay)
- Build `/api/issue-counts/route.ts` + `/api/issue-counts/increment/route.ts`
- Build `PolisOverlay.tsx` (bar + percentage + privacy copy)

### Phase 6 (Integration)
- Update `BallotTool.tsx` to show ranking + concern flow
- Update `promptBuilder.ts` to embed ranked issues + concerns in system prompt + copy-paste blocks
- Add i18n keys for all new UI text

### Phase 7 (Polish)
- Unit tests for canonical issues, upstash client, prompt builder extensions
- Verify all data-testid attributes
