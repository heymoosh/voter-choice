# Feature Specification: Real Ballot Data Integration

**Feature Name:** real-ballot-data
**Status:** Ready for Implementation
**Created:** 2026-05-12
**Phase:** 3

---

## Overview

Replace static JSON stub data with a live data layer that pulls current election information from public APIs. Users entering any U.S. zip code should receive accurate, current election information — not stub data.

This phase is an architectural transition from a simple static-data lookup to a multi-source data aggregation layer with caching, error handling, progressive loading states, and fallback behavior.

---

## Functional Requirements

### FR-1: Live Data Integration
- The app fetches real election data from Google Civic Information API using the user's zip code
- API keys are stored server-side only; never exposed to the client bundle
- All external API calls are proxied through Next.js API routes

### FR-2: Data Sources
- **Google Civic API** (required): Election dates, candidate info, ballot contests, polling locations
- **Anthropic API with web_search** (required): Candidate voting record summaries, donor highlights, endorsements — fetched when user expands a candidate panel
- **Static Voter ID JSON** (gap coverage): State-by-state voter ID requirements for all 50 states + DC

### FR-3: Data Access Layer Abstraction
- All API calls go through a single data-access module
- UI components consume a unified data model; they do not know which API provides which data
- Adding or removing a data source requires changes only in the data-access layer

### FR-4: Caching
- API responses are cached per zip code per session (in-memory)
- Cache TTL: 1 hour
- Second lookup for the same zip code is instant (no loading state shown)
- No persistent storage; consistent with "we don't store your data" principle

### FR-5: Loading States
- Zip code submit button shows loading state while data is being fetched
- Skeleton/placeholder UI appears while API data loads
- Progressive display: each section appears as its data arrives

### FR-6: Error Handling and Fallbacks
- If one API fails: display data from APIs that responded + non-alarming warning banner
- If all APIs fail: fall back to static voter ID JSON + explanation message
- API timeout: 10 seconds per source
- Errors logged to browser console only; no external reporting

### FR-7: Polling Location Display
- Show user's assigned polling place from Google Civic (based on zip code)

### FR-8: Ballot Contests Section
- List the races and ballot measures on the user's specific ballot (from Google Civic)
- For each candidate in a race, show a "View voting record" expandable panel
- Panel content: voting record summary, top donors, key endorsements via Anthropic web_search
- Panel collapsed by default; expands inline on click

### FR-9: Enriched Prompt Output
- The pre-filled context block includes: districts (county, congressional, state legislative), ballot contests, key candidates with brief voting record summaries, polling place, voter ID requirements
- Remains a single copy-pasteable block

### FR-10: Internationalization
- All new UI text available in English and Spanish using the existing i18n pattern
- Translation architecture must not hard-code a two-language assumption (Phase 4 adds more)

### FR-11: Data Attribution and Freshness
- Footer text: "Election data from Google Civic Information and live web search via Anthropic. Verify at [state election office link]."
- Show timestamp: "Updated [timestamp]"

### FR-12: Environment Variables
- `.env.example` documents all required variables: GOOGLE_CIVIC_API_KEY, ANTHROPIC_VOTER_API, OPENSTATES_API_KEY (optional), OPENFEC_API_KEY (optional)
- Actual keys in `.env.local` (gitignored)

---

## User Stories

### US1 — Live Election Data on Zip Entry (P1)
**As a** voter entering my zip code,
**I want to** see real, current election information,
**so that** I have accurate data for my specific location.

**Acceptance criteria:**
- Google Civic API is called with the zip code
- Polling location displays from API data (data-testid="polling-location")
- Ballot contests display from API data (data-testid="ballot-contests")
- Data attribution footer present (data-testid="data-attribution")
- Last updated timestamp shown

### US2 — Candidate Detail Expansion (P1)
**As a** voter reviewing my ballot,
**I want to** expand a candidate panel to see their voting record,
**so that** I can make an informed decision.

**Acceptance criteria:**
- Each candidate in a race has an expandable "View voting record" panel
- Panel fetches data via Anthropic web_search at expand-time
- Panel shows voting record summary, top donors, endorsements
- data-testid="candidate-detail" on each candidate block

### US3 — Progressive Loading (P1)
**As a** voter,
**I want to** see data sections appear as they load,
**so that** I'm not staring at a blank page waiting for all APIs.

**Acceptance criteria:**
- Loading skeleton appears immediately (data-testid="data-loading")
- Sections render as their data arrives
- No full-page loading block

### US4 — Graceful API Failure (P1)
**As a** voter,
**I want to** still see useful information if some data sources fail,
**so that** a temporary API outage doesn't leave me with nothing.

**Acceptance criteria:**
- Partial failure: warning banner (data-testid="api-partial-error") + available data shown
- Full failure: fallback to static voter ID data + explanation (data-testid="api-full-error")
- App never crashes on API failure

### US5 — Voter ID Requirements (P2)
**As a** voter,
**I want to** see my state's voter ID requirements,
**so that** I know what to bring to the polls.

**Acceptance criteria:**
- Static voter ID JSON serves all 50 states + DC
- Each entry includes lastVerified date
- Display includes "Verify current requirements at [state election office link]"

### US6 — In-Session Caching (P2)
**As a** returning user within the same session,
**I want to** see cached results for a zip code I already looked up,
**so that** repeated lookups are instant.

**Acceptance criteria:**
- Second lookup for same zip shows result without loading state
- Cache TTL is 1 hour (session-based)

---

## Non-Functional Requirements

### NFR-1: API Security
- Zero API keys exposed in client-side bundle
- All external API calls server-side only

### NFR-2: Performance
- API timeout: 10 seconds per source
- Cached lookups are instant (no observable delay)
- Bundle size not significantly increased (server-side API code only)

### NFR-3: Reliability
- App functions with partial API availability
- App functions with zero API availability (static fallback)
- No crashes on any API failure mode

### NFR-4: Privacy
- Only zip code / location data sent to external APIs
- No user data logged, stored, or sent anywhere except the respective API endpoints

---

## Data Requirements

### Required data-testid Attributes (additive to existing)

| data-testid         | Element                              |
| ------------------- | ------------------------------------ |
| polling-location    | Polling place display                |
| ballot-contests     | Ballot contests section              |
| candidate-detail    | Individual candidate info block      |
| data-loading        | Any section in loading state         |
| api-partial-error   | Partial API failure banner           |
| api-full-error      | Full API failure fallback            |
| data-attribution    | Data source footer                   |

### Voter ID JSON Schema (per state)

```json
{
  "state": "TX",
  "voterIdRequired": true,
  "idType": "strict-photo",
  "acceptedIds": ["..."],
  "exceptions": "...",
  "provisionalBallot": true,
  "provisionalBallotRules": "...",
  "phonesAtPolls": false,
  "phonesAtPollsDetail": "...",
  "sourceUrl": "...",
  "lastVerified": "2026-04-03"
}
```

---

## Edge Cases and Error Handling

- Zip code spanning multiple districts: extend existing multi-state selector pattern
- API timeout (>10s): treat as partial failure for that source
- Google Civic returns no data for zip: show available static data + warning
- Anthropic web_search returns empty result: show "No data available" in candidate panel
- Candidate panel expand while previous expand is loading: handle gracefully (only one in-flight at a time)

---

## Out of Scope

- LLM chat window (Phase 5)
- New languages beyond English and Spanish (Phase 4)
- User accounts or persistent storage
- Paid API subscriptions

---

## Assumptions

- Google Civic API key is pre-provisioned in .env.local
- Anthropic API key (ANTHROPIC_VOTER_API) reuses the same key as Phase 5 chat
- Static voter ID JSON covers all 50 states + DC with data from NCSL + state SoS sites
- E2e tests mock external API responses for determinism

---

## Clarifications

### Session 2026-05-12
- Q: Should OpenStates and OpenFEC be integrated? → A: Optional; Anthropic web_search covers the same ground if not integrated. Framework may choose to integrate.
- Q: What fallback for zip codes not in Google Civic coverage? → A: Show available static data (voter ID JSON) + non-alarming message with state election office link
- Q: Cache implementation: client-side or server-side? → A: Client-side in-memory (session cache in React state or module-level Map), consistent with "no persistent storage" principle

---

## Success Criteria

- User enters a real zip code and sees current election data from live APIs
- Voter ID requirements display for all 50 states + DC
- API keys never appear in client-side code or browser network requests to non-proxied endpoints
- Loading states visible during data fetch
- Partial and full API failure handled without crashes
- All new UI text in English and Spanish
- All required data-testid attributes present
- Cache prevents redundant API calls within session
- Existing e2e tests from Phases 1-2 still pass
