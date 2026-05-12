# PHASE6_SPEC.md — Concern Disambiguation, Issue Ranking, and Anonymous Aggregate Counters

**Version:** 1.0
**Status:** Draft
**Last updated:** 2026-05-11

This document describes the desired behavior for adding (a) a drag-and-rank issue prioritization UX, (b) free-text concern → canonical-issue mapping with voter confirmation, and (c) anonymous aggregate counters with a Polis-style overlay showing concern distribution across voters who researched the same ballot. It is the shared modification request that all five workflow runs receive in Phase 6. It describes **what** should change, not **how** to implement it.

---

## Overview

Phase 6 is the final feature-parity phase against the launch-production target. It introduces three intertwined pieces:

1. **Issue Ranking UX** — Replace any free-form values discussion with a structured drag-and-rank interface. The user orders their priorities; the ordering feeds the alignment scorer (Phase 5) and the aggregate counter.
2. **Concern Disambiguation** — A free-text concern entry where the user can describe what they care about in their own words. An AI step maps the free text to the app's canonical issue taxonomy. The user confirms the mapping before it influences scoring.
3. **Anonymous Aggregate Counters + Polis Overlay** — Server-side, anonymized counts of "how many voters in [county] said [issue] mattered to them" — surfaced as a small Polis-style overlay on each issue card.

All three plug into the existing Phase 5 chat and copy-paste paths. The chat consumes the ranked issues + confirmed concerns as part of its system context. The copy-paste prompt embeds them in the prefilled context block.

---

## Feature 1: Issue Ranking

### What It Is

A drag-and-rank list of canonical issues that the user orders by personal priority. The top of the list is what the user cares about most.

### Issue Taxonomy

The canonical issue set lives in `src/lib/canonicalIssues.ts` and is a frozen list for this experiment. Suggested issues (the actual list MUST be hardcoded — frameworks decide UI presentation, not taxonomy):

- Economy & Jobs
- Healthcare
- Education
- Climate & Environment
- Housing
- Crime & Public Safety
- Immigration
- Reproductive Rights
- Civil Rights & Equality
- Gun Policy
- Foreign Policy
- Voting Rights & Democracy

### UX Requirements

- **Drag-and-drop reordering** using `@dnd-kit/core` and `@dnd-kit/sortable` (or equivalent — these libraries are the v1 reference but frameworks may substitute if they justify it in their workflow log)
- **Keyboard accessibility** is mandatory — every drag must be performable with keyboard alone (arrow keys + space to grab/drop), with `aria-live` announcements of the new ordering
- **No persistence by default** — order resets when the page reloads, consistent with the privacy architecture
- **Skip option** — User can skip ranking entirely; the alignment scorer falls back to "no priority weighting" mode
- **Top-3 callout** — The top three ranked issues are surfaced as the user's "key priorities" elsewhere in the UI (chat system prompt, copy-paste context block, voter profile output)

### Output Structure

When the user finishes ranking (or skips), the ranking is exposed as a `RankedIssues` object:

```ts
type RankedIssues = {
  ordered: string[];  // canonical issue keys, top priority first
  skipped: boolean;
  timestamp: string;  // ISO-8601, browser-local
};
```

Used by Phase 5's chat system prompt (preamble), the copy-paste context block, and the alignment-score calculation.

### Required `data-testid`

- `issue-ranking-list` on the sortable container
- `issue-rank-item-<issue-slug>` on each ranked row
- `issue-rank-skip-button` on the skip CTA
- `issue-rank-confirm-button` on the confirm CTA

### Acceptance Criteria

- [ ] User can drag-rank 12 canonical issues via mouse
- [ ] User can rank via keyboard alone (arrow keys + space)
- [ ] Screen-reader announces order changes via `aria-live`
- [ ] Skipping the step is supported and the downstream UI handles `skipped: true`
- [ ] Top-3 ranked issues appear in the Phase 5 chat system prompt
- [ ] Top-3 ranked issues appear in the copy-paste context block
- [ ] No data persisted client-side (no localStorage, sessionStorage, cookies)

---

## Feature 2: Concern Disambiguation

### What It Is

A free-text input where the user describes what they care about in their own words. The app uses Anthropic API (the same Phase 5 chat budget) to map the free text to one or more canonical issues, then asks the user to confirm.

### User Flow

1. User finishes Issue Ranking (Feature 1)
2. User is shown an optional free-text concern field: "Anything specific you want the AI to know about your priorities? (e.g., 'I rent and can't afford housing in my city,' or 'my kid has Type 1 diabetes')"
3. User can skip (proceed without free text) OR enter text
4. If text is entered, the app POSTs to `/api/disambiguate-concerns` with the free text
5. The API uses Claude Sonnet to map the text to canonical issues (returns `{matchedIssues: ["Housing", "Healthcare"], rationale: "..."}` plus the original quote)
6. The user is shown the AI's interpretation and confirms or edits before proceeding

### Confirmation UI

After the disambiguation API returns:

```
We heard:
"I rent and can't afford housing in my city. My kid has Type 1 diabetes."

Mapping to issues we track:
  ☑ Housing — "rent and can't afford housing"
  ☑ Healthcare — "kid has Type 1 diabetes"
  ☐ Economy & Jobs — (we didn't see a strong signal, but you can add it)

[Confirm and continue] [Edit] [Skip mapping]
```

- The user can check/uncheck issues to override the AI's mapping
- The user can re-enter free text and re-disambiguate
- The user can skip the confirmation entirely (free-text gets discarded, only the explicit ranking is used)

### API Route Behavior

`POST /api/disambiguate-concerns`

**Request:**
```json
{ "concernText": "I rent and can't afford housing..." }
```

**Response:**
```json
{
  "interpretation": "Housing affordability is a primary concern, with healthcare costs (specifically chronic condition management) as a secondary concern.",
  "matchedIssues": [
    {"issue": "Housing", "quote": "rent and can't afford housing", "confidence": "high"},
    {"issue": "Healthcare", "quote": "kid has Type 1 diabetes", "confidence": "high"}
  ],
  "unmatched": []
}
```

**Security:**
- Same rate-limit and budget controls as the Phase 5 chat API
- Concern text counts toward the $20/month Anthropic budget cap
- No server-side logging of concern text
- Concern text is treated as untrusted input — prompt injection protections per Phase 5 voter-profile rules apply

### Output Structure

```ts
type ConfirmedConcerns = {
  freeText: string | null;
  confirmedIssues: string[];  // canonical keys the user checked
  skipped: boolean;
};
```

### Structured Blocks

For the copy-paste prompt (Path B), embed the user's input as:

```
[VOTER VALUES]
{
  "rankedIssues": ["Healthcare", "Housing", "Climate & Environment", ...],
  "topPriorities": ["Healthcare", "Housing", "Climate & Environment"]
}
[/VOTER VALUES]

[CONCERN_INTERPRETATION]
{
  "freeText": "I rent and can't afford housing in my city...",
  "confirmedIssues": ["Housing", "Healthcare"]
}
[/CONCERN_INTERPRETATION]

[VOTER CONFIRMED CONCERNS]
{
  "primaryIssues": ["Housing", "Healthcare"],
  "rationale": "User confirmed AI's mapping unchanged"
}
[/VOTER CONFIRMED CONCERNS]
```

The chat (Path A) embeds the same data in the system prompt without the structured-block wrappers.

### Required `data-testid`

- `concern-disambiguation-input` on the free-text field
- `concern-disambiguation-submit` on the submit button
- `concern-mapping-confirmation` on the confirmation panel
- `concern-mapping-issue-<issue-slug>` on each issue checkbox
- `concern-confirm-button` on the final confirm

### Acceptance Criteria

- [ ] User can enter free-text concerns or skip
- [ ] If text is submitted, the disambiguation API returns mapped canonical issues + rationale
- [ ] User can edit the AI mapping before confirming
- [ ] Confirmed concerns appear in the chat system prompt
- [ ] Confirmed concerns appear as structured blocks in the copy-paste prompt
- [ ] No server-side logging of concern text
- [ ] Prompt injection protections (Phase 5 voter-profile rules) apply

---

## Feature 3: Anonymous Aggregate Counters + Polis Overlay

### What It Is

For each issue the user ranks or confirms, surface a small inline stat: "X others in [your county] said this matters too." Powered by an anonymous, county-aggregated counter stored server-side.

### Privacy Architecture

This is the **single, narrow exception** to the "no server-side storage of user input" principle. The exception is approved only because:

- The stored data is **county-level aggregate counts**, not individual records
- There is **no linkage back to the user** — no IP, no session, no identifier
- The increment is **debounced and rate-limited** at the API layer
- The data **cannot be queried** back as anything other than aggregate counts (no per-record lookup, no time-series with sub-hour resolution)

The application must explicitly document this exception in user-facing privacy copy: "When you rank an issue, we anonymously add to a county-level count that other voters can see. We never store your zip code, your ranking sequence, or anything else — just '+1 in [county] for [issue].'"

### Storage

- **Backend:** Upstash Redis (or equivalent serverless KV with HTTP API) — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars
- **Key format:** `count:<county_fips>:<issue_slug>` (integer value)
- **TTL:** None — counts are cumulative until manually reset
- **No PII keys anywhere in Redis**

### API Route Behavior

`POST /api/issue-counts/increment`

**Request:**
```json
{ "countyFips": "48201", "issueSlug": "housing" }
```

- API derives countyFips server-side from the zip code via Google Civic (already a Phase 3 dependency), so the client never sends it directly
- Single increment per session per issue (deduplicate via a short-lived signed token in the response of the issue-ranking step, never via a user identifier)

**Response:**
```json
{ "success": true }
```

`GET /api/issue-counts?countyFips=<fips>`

**Response:**
```json
{
  "countyFips": "48201",
  "issueCounts": {
    "housing": 2841,
    "healthcare": 3120,
    "economy": 4012,
    ...
  },
  "totalRespondents": null  // intentional — we don't track unique respondents
}
```

### Polis Overlay UI

On each issue card (whether in the ranking step or in the chat sidebar), surface a small inline element:

```
┌─────────────────────────┐
│ Housing                 │
│ ▆▆▆▆▆▆▆▆▆ 47%           │
│ Of voters in your county│
│ who ranked their issues │
└─────────────────────────┘
```

The bar visualizes this issue's count relative to the top-counted issue in the same county. (Not relative to total respondents — we don't track that.)

### Required `data-testid`

- `issue-count-bar-<issue-slug>` on the visual bar
- `issue-count-value-<issue-slug>` on the percentage number
- `issue-count-county-label` on the "your county" caption

### Acceptance Criteria

- [ ] Ranking an issue triggers one and only one server-side increment per session
- [ ] The Polis overlay renders for each issue in the user's county
- [ ] No PII is stored in Redis (verifiable: `redis-cli SCAN` shows only `count:*:*` keys)
- [ ] The privacy disclosure is shown alongside the overlay
- [ ] The API gracefully degrades if Upstash credentials are missing — the overlay simply doesn't render, and ranking still works

---

## Translation

- Issue labels and disambiguation UI labels translate via Phase 4's i18n system
- The free-text concern field accepts input in any language; the disambiguation prompt instructs Claude to respond in the user's selected language

## Accessibility

- Drag-rank must be keyboard-fully-operable with screen-reader announcements
- Confirmation panel must have semantic checkbox roles with proper `aria-checked` state
- Polis overlay bars need both `aria-valuenow` (current count) and a textual readout for screen readers
- No reliance on color alone for any of the new UI

## Environment Variables (new in Phase 6)

| Env Var | Purpose | Provisioning |
|---------|---------|--------------|
| `UPSTASH_REDIS_REST_URL` | Aggregate counter backend | Required for Feature 3; Phase 6 builds without it should leave the overlay off but ship the rest |
| `UPSTASH_REDIS_REST_TOKEN` | Aggregate counter auth | Same as above |

The Phase 5 `ANTHROPIC_API_KEY` is reused for concern disambiguation (no new key).

## Out of Scope for Phase 6

- Multi-county aggregation (e.g., "your state average")
- Time-windowed counts ("trending this week")
- Issue grouping or correlation analysis
- Public dashboard for aggregate data (the data is internal to the user's experience only)

These are post-experiment v3 features.

## Acceptance Criteria

Each criterion is a single testable assertion. Every e2e and integration test should reference the `AC-6.x` ID it covers in its `describe()` or `test()` name.

- **AC-6.1** — The user can drag and rank the canonical issue list, and the ordered result feeds downstream alignment scoring.
- **AC-6.2** — Free-text concerns are mapped to canonical issues with an explicit user confirmation step before they affect scoring or aggregates.
- **AC-6.3** — Anonymous aggregate counters are stored without personal identity and can be rendered back as issue-distribution data for the same ballot.
- **AC-6.4** — The Polis-style overlay displays the aggregate concern distribution in the documented UI.
- **AC-6.5** — Translation and accessibility coverage extend to the new issue-ranking, disambiguation, and aggregate-display surfaces.
- **AC-6.6** — All required Phase 6 test ids are present for ranking, disambiguation, and aggregate-counter interactions.

## Required UX Flows

- **UX-6.1** — A voter ranks issues via drag-and-drop, reviews the updated order, and proceeds without losing their previous ballot context.
- **UX-6.2** — A voter enters a free-text concern, confirms the canonical mapping, and sees the confirmed issue reflected in the UI.
- **UX-6.3** — A voter opens the aggregate overlay and understands how similar voters prioritized issues without revealing any individual identity.

## Non-Functional Requirements

- **NFR-6.1** *(Performance)* — First Load JS must remain at or below 130 kB after adding ranking and aggregate-counter UI.
- **NFR-6.2** *(Accessibility)* — Lighthouse accessibility score must remain at or above 90 with drag/rank and overlay interactions enabled.
- **NFR-6.3** *(Performance)* — Lighthouse performance score must remain at or above 85.
- **NFR-6.4** *(Security)* — `npm audit --json` must report 0 HIGH or CRITICAL vulnerabilities.
- **NFR-6.5** *(Privacy)* — Aggregate counters must remain anonymous and must not store personal identifiers, raw chat transcripts, or zip-code history.
