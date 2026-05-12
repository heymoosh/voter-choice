# Feature Specification: Issue Ranking, Concern Disambiguation, and Anonymous Aggregate Counters

**Feature Name:** issue-ranking-concerns-aggregate
**Status:** Ready for Implementation
**Created:** 2026-05-12
**Phase:** 6

---

## Overview

Phase 6 adds three intertwined features to the voter-choice app: (1) a drag-and-rank issue prioritization UX, (2) free-text concern → canonical-issue mapping with voter confirmation via AI disambiguation, and (3) anonymous aggregate counters with a Polis-style overlay showing concern distribution across voters who researched the same ballot.

All three plug into the existing Phase 5 chat and copy-paste paths. The chat consumes the ranked issues and confirmed concerns as part of its system context. The copy-paste prompt embeds them in structured context blocks.

---

## Functional Requirements

### FR-R01: Issue Ranking UI
- A drag-and-rank list of 12 canonical issues that the user orders by personal priority (top = most important)
- Drag-and-drop reordering using `@dnd-kit/core` and `@dnd-kit/sortable`
- Keyboard accessibility: every drag operable with arrow keys + space to grab/drop
- `aria-live` announcements of new ordering after each reorder
- No persistence by default — order resets on page reload
- Skip option: user can skip ranking entirely; downstream scorer falls back to "no priority weighting"
- Top-3 ranked issues surfaced as "key priorities" in chat system prompt and copy-paste context block
- Required `data-testid` attributes: `issue-ranking-list`, `issue-rank-item-<issue-slug>`, `issue-rank-skip-button`, `issue-rank-confirm-button`

### FR-R02: Canonical Issue Taxonomy
- The canonical issue set is frozen and stored in `src/lib/canonicalIssues.ts`
- 12 issues: Economy & Jobs, Healthcare, Education, Climate & Environment, Housing, Crime & Public Safety, Immigration, Reproductive Rights, Civil Rights & Equality, Gun Policy, Foreign Policy, Voting Rights & Democracy

### FR-R03: Issue Ranking Output
- Produces a `RankedIssues` object: `{ ordered: string[], skipped: boolean, timestamp: string }`
- Used by Phase 5 chat system prompt, copy-paste context block, and alignment-score calculation

### FR-D01: Concern Disambiguation Input
- Optional free-text field after issue ranking: "Anything specific you want the AI to know about your priorities?"
- User can skip (proceed without free text) OR enter text and submit
- If text is entered, the app POSTs to `/api/disambiguate-concerns` with the free text
- Required `data-testid` attributes: `concern-disambiguation-input`, `concern-disambiguation-submit`

### FR-D02: Disambiguation API
- `POST /api/disambiguate-concerns` uses Claude Sonnet to map free text to canonical issues
- Returns `{ interpretation: string, matchedIssues: Array<{issue, quote, confidence}>, unmatched: [] }`
- Same rate-limit and budget controls as Phase 5 chat API
- No server-side logging of concern text
- Prompt injection protections per Phase 5 voter-profile rules apply

### FR-D03: Concern Confirmation UI
- Shows AI interpretation with checkboxes per matched issue
- User can check/uncheck issues to override AI mapping
- User can re-enter free text and re-disambiguate
- User can skip confirmation (free text discarded, only explicit ranking used)
- Required `data-testid` attributes: `concern-mapping-confirmation`, `concern-mapping-issue-<issue-slug>`, `concern-confirm-button`

### FR-D04: Concern Output
- Produces a `ConfirmedConcerns` object: `{ freeText: string | null, confirmedIssues: string[], skipped: boolean }`
- Confirmed concerns embedded in chat system prompt and copy-paste structured blocks

### FR-A01: Anonymous Aggregate Counters (Upstash Redis)
- Backend: Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)
- Key format: `count:<county_fips>:<issue_slug>` (integer)
- No TTL — counts are cumulative
- No PII keys anywhere in Redis

### FR-A02: Increment API
- `POST /api/issue-counts/increment` — increments counter for confirmed issues
- County FIPS derived server-side from existing civic API data (not sent by client)
- One increment per session per issue (via short-lived signed deduplication token)
- Response: `{ success: true }`
- Gracefully degrades if Upstash credentials are missing

### FR-A03: Read API
- `GET /api/issue-counts?countyFips=<fips>` returns `{ countyFips, issueCounts: Record<string, number>, totalRespondents: null }`
- Gracefully degrades if Upstash credentials are missing

### FR-A04: Polis Overlay UI
- Each issue card shows a small inline stat: count relative to top-counted issue (bar + percentage)
- Required `data-testid` attributes: `issue-count-bar-<issue-slug>`, `issue-count-value-<issue-slug>`, `issue-count-county-label`
- Privacy disclosure shown alongside: "When you rank an issue, we anonymously add to a county-level count..."
- Gracefully degrades (overlay not rendered) if Upstash credentials are missing

### FR-I01: Phase 5 Integration
- Chat system prompt includes top-3 ranked issues and confirmed concerns (no wrappers)
- Copy-paste prompt includes `[VOTER VALUES]`, `[CONCERN_INTERPRETATION]`, and `[VOTER CONFIRMED CONCERNS]` structured blocks

### FR-L01: Internationalization
- Issue labels and disambiguation UI labels translate via Phase 4's i18n system
- Free-text concern field accepts input in any language; disambiguation prompt instructs Claude to respond in user's selected language

---

## User Scenarios

### Scenario 1: User ranks issues and proceeds to chat
1. User enters zip code, sees election data
2. Issue ranking component appears; user drags issues into preferred order
3. User optionally enters a free-text concern and submits
4. AI maps concern to canonical issues; user confirms
5. User opens chat; AI acknowledges ranked issues and confirmed concerns as context
6. Chat produces aligned ballot research informed by user priorities

### Scenario 2: User skips both ranking and concern
1. User enters zip code
2. User skips issue ranking (clicks skip)
3. User skips concern disambiguation
4. Chat/copy-paste flow continues with no priority context (scorer uses flat weighting)

### Scenario 3: Polis overlay engagement
1. User ranks issues; overlay shows "X others in [county] said this matters"
2. User can see relative popularity of issues in their county
3. Counters increment anonymously after confirmation; no PII stored

### Scenario 4: Upstash unavailable
1. `UPSTASH_REDIS_REST_URL` missing or request fails
2. Polis overlay does not render; issue ranking and concern disambiguation still work
3. No error shown to user for missing overlay

---

## Success Criteria

- Users can drag-rank 12 canonical issues via mouse and keyboard alone
- Screen readers announce order changes via `aria-live`
- Skipping ranking is supported and downstream UI handles `skipped: true`
- Top-3 ranked issues appear in the Phase 5 chat system prompt
- Top-3 ranked issues appear in the copy-paste context block
- Disambiguation API returns mapped canonical issues with rationale
- User can edit AI mapping before confirming
- No server-side logging of concern text
- Polis overlay renders correct relative percentages for each issue
- Ranking an issue triggers exactly one server-side increment per session
- Overlay and counters gracefully absent when Upstash credentials missing
- All `data-testid` attributes present for e2e coverage
- No data persisted client-side (no localStorage, sessionStorage, cookies for ranking/concerns)

---

## Dependencies

- Phase 5: Chat system prompt builder (`src/lib/promptBuilder.ts`)
- Phase 5: Copy-paste prompt builder
- Phase 4: i18n system for translation of new UI text
- Phase 3: Google Civic API for county FIPS derivation (existing dependency)
- Anthropic API: `claude-sonnet-4-6` (reused from Phase 5)
- Upstash Redis: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (new env vars)
- `@dnd-kit/core`, `@dnd-kit/sortable` (new npm dependencies)

---

## Clarifications

### Session 2026-05-12

- Q: Should the issue ranking appear before or after zip code submission? → A: After zip code submission and data load (ranking is contextual to the ballot, not a prerequisite).
- Q: County FIPS for aggregate counters — source? → A: Derived server-side from existing civic API response (already available from Phase 3); client sends no location data.
- Q: Deduplication token format for single-increment-per-session enforcement? → A: Short-lived HMAC-signed token (expires 1 hour) returned with the issue-ranking confirmation; stored in React state only (no cookies/localStorage).
- Q: Concern disambiguation language handling? → A: Disambiguation prompt instructs Claude to respond in user's selected locale; response issues are always matched against the canonical English issue keys.
- Q: What happens if the disambiguation API returns an empty matchedIssues array? → A: Confirmation UI shows "No specific issues detected" with option to manually add issues or skip.

---

## Assumptions

- Upstash Redis is provisioned and credentials provided in `.env.local` for production; overlay degrades gracefully without them
- The `@dnd-kit` library is the preferred drag-and-drop implementation per spec
- County FIPS is already available in the `LiveElectionData` response from Phase 3 civic API enrichment
- Issue ranking and concern disambiguation appear between data load and chat/copy-paste options
- The 12-issue canonical list is frozen for this experiment phase
