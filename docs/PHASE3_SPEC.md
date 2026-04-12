# PHASE3_SPEC.md — Real Ballot Data Integration

**Version:** 1.0 draft (Cowork planning doc — formalize in Claude Code before execution)
**Status:** Draft
**Last updated:** April 3, 2026

This document describes the desired behavior and outcomes for replacing static JSON stub data with live election data from free public APIs. It is the shared modification request that all five workflow runs receive in Phase 3. It describes **what** should change, not **how** to implement it.

---

## Overview

Replace the 2-3 state static JSON stubs with a data layer that pulls real, current election information from multiple free public APIs. Where API coverage has gaps (notably voter ID requirements), supplement with curated static JSON. The result: a user entering any U.S. zip code gets accurate, current election information — not stub data.

This phase is an architectural stress test. The app moves from a simple static-data lookup to a multi-source data aggregation layer with caching, error handling, loading states, and fallback behavior. The data-access layer should be cleanly abstracted so that adding or removing a data source does not require changes to UI components.

---

## Data Sources

### Primary APIs (required)

All APIs below are free. API keys should be stored as environment variables, never committed to the codebase.

#### 1. Google Civic Information API

- **Provides:** Polling locations by address, election dates, candidate information, ballot contests/measures, state election official contact info
- **Auth:** API key (free, register at Google Cloud Console)
- **Rate limit:** 25,000 queries/day
- **Coverage:** 40+ states + DC
- **Primary use in this app:** Election dates, candidate info, ballot contests, polling locations

#### 2. Democracy Works Elections API

- **Provides:** Election dates and deadlines, voter registration deadlines (state-specific), early voting dates, absentee ballot deadlines, sample ballot URLs, local election office contact info
- **Auth:** Registration required (free tier)
- **Primary use in this app:** Registration deadlines, early voting dates, sample ballot URLs, local election office links

#### 3. Vote Smart API

- **Provides:** Candidate voting records, issue positions, campaign contributions, ratings and endorsements, candidate backgrounds
- **Auth:** API key (free, no registration required)
- **Primary use in this app:** Candidate voting records and issue positions (feeds the AI prompt context)

#### 4. OpenStates API

- **Provides:** State legislators and contact info, state bills and voting records, committee memberships
- **Auth:** API key (free, register at open.pluralpolicy.com)
- **Primary use in this app:** State legislator info, voting records for state-level races

#### 5. OpenFEC API

- **Provides:** Federal campaign contributions, spending data, political committee filings, candidate finance data
- **Auth:** API key (free, maintained by Federal Election Commission)
- **Primary use in this app:** Campaign finance data for federal races (Senate, House, President)

### Static JSON (gap coverage)

#### Voter ID Requirements

- **What:** State-by-state voter ID rules, accepted forms of ID, exceptions
- **Why static:** No free API provides this data. VoteAmerica covers it but requires a paid subscription.
- **Format:** Same JSON schema pattern as the existing state data files, one file per state
- **Scope:** All 50 states + DC. Data should be sourced from the National Conference of State Legislatures (NCSL) voter ID requirements page and each state's Secretary of State website.
- **Maintenance note:** Voter ID laws change. Each JSON file should include a `lastVerified` date field. The app should display "Verify current requirements at [state election office link]" alongside any voter ID information.

**Voter ID JSON schema (per state):**

```json
{
  "state": "TX",
  "voterIdRequired": true,
  "idType": "strict-photo",
  "acceptedIds": [
    "Texas driver's license or ID card",
    "Texas Election Identification Certificate",
    "Texas personal ID card issued by DPS",
    "US military ID card with photo",
    "US citizenship certificate with photo",
    "US passport (book or card)",
    "Texas license to carry a handgun"
  ],
  "exceptions": "Voters without acceptable ID can sign a Reasonable Impediment Declaration and present alternative ID (utility bill, bank statement, government document with name and address, paycheck, certified birth certificate).",
  "provisionalBallot": true,
  "provisionalBallotRules": "Voters who do not present ID or sign a declaration can cast a provisional ballot and provide ID within 6 calendar days.",
  "phonesAtPolls": false,
  "phonesAtPollsDetail": "Texas law prohibits wireless communication devices in the voting room. You may bring written notes.",
  "sourceUrl": "https://www.sos.texas.gov/elections/voter/photo-id.shtml",
  "lastVerified": "2026-04-03"
}
```

### Zip Code → Location Mapping

The app currently uses zip codes to look up states. With real APIs, the zip code needs to resolve to more granular location data:

- Zip code → state (existing)
- Zip code → county (needed for local election office lookups)
- Zip code → congressional district (needed for federal race lookups)
- Zip code → state legislative districts (needed for state race lookups)

Google Civic Information API handles this mapping when given an address. The app should accept a zip code from the user and use it to query the API for representative info, which returns district assignments. If a zip code spans multiple districts, the existing multi-state selector pattern extends to handle multi-district selection.

---

## Architecture Requirements

### Data Access Layer

- All API calls should go through a single data-access layer (not scattered across components)
- UI components should not know or care which API provides which data — they consume a unified data model
- Adding a new data source or removing an existing one should require changes only in the data-access layer, not in UI components
- The data model from Phases 1-2 (the TypeScript interfaces for state data) should be extended, not replaced. New fields are additive.

### Caching

- API responses should be cached to avoid redundant calls and stay within rate limits
- Cache strategy: cache per zip code per session. If a user enters the same zip code twice, the second lookup should be instant.
- Cache should live in memory (no persistent storage — consistent with the "we don't store your data" principle)
- Cache TTL: 1 hour (election data doesn't change minute-to-minute)

### Loading States

- When API calls are in progress, the UI should show loading indicators on the sections being populated
- Loading should be progressive — if Google Civic responds before Democracy Works, show what's available immediately rather than waiting for all sources
- The zip code entry form should show a spinner or loading state on the submit button while data is being fetched

### Error Handling and Fallbacks

- If an API is unavailable (down, rate-limited, or returns an error), the app should:
  1. Display the data from APIs that DID respond
  2. Show a clear, non-alarming message for the missing data: "Some election data is temporarily unavailable. The information shown is current. [Link to state election office] for complete details."
  3. NOT crash or show a blank page
- If ALL APIs fail, fall back to the static voter ID JSON (which will at least show state-level voting rules) and display: "We're having trouble loading live election data. Here's what we know about voting in [State]. Visit [state election office link] for current dates and deadlines."
- API timeout: 10 seconds per source. Don't let a slow API block the entire experience.
- Log errors to the browser console for debugging. Do NOT send error data to any external service.

### Environment Variables

The following environment variables are required. They must be documented in a `.env.example` file (committed) with placeholder values. Actual keys go in `.env.local` (gitignored).

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CIVIC_API_KEY` | Google Civic Information API |
| `DEMOCRACY_WORKS_API_KEY` | Democracy Works Elections API |
| `VOTE_SMART_API_KEY` | Vote Smart API |
| `OPENSTATES_API_KEY` | OpenStates API |
| `OPENFEC_API_KEY` | OpenFEC API |

### API Key Security

- API calls must happen server-side (Next.js API routes or server components). API keys must never be exposed to the browser.
- The client makes requests to the app's own API routes, which proxy to external APIs.

---

## UI Changes

### State Info Display (updated)

The state info card from Phases 1-2 now displays real data instead of stubs. The layout and fields remain the same, but with these additions:

- **Polling location** — new field showing the user's assigned polling place (from Google Civic, based on zip code)
- **Ballot contests** — new section listing the races and measures on the user's specific ballot (from Google Civic)
- **Candidate info enrichment** — within the ballot contests section, for each candidate listed in a race, show a "View voting record" expandable panel that displays Vote Smart / OpenStates / OpenFEC data (voting record summary, top donors, key endorsements). The panel is collapsed by default; clicking expands it inline.
- **Data source attribution** — small footer text on the info card: "Election data from Google Civic Information, Democracy Works, Vote Smart, OpenStates, and OpenFEC. Verify at [state election office link]."
- **Last updated indicator** — show when the data was fetched: "Updated [timestamp]"

### Loading States (new)

- Skeleton/placeholder UI while API data loads (not a blank section that pops in)
- Progressive display: show each section as its data arrives
- Zip code submit button shows loading state during fetch

### Error States (updated)

Existing error states from Phases 1-2 remain. New error states:

| Condition | Display | `data-testid` |
|-----------|---------|---------------|
| API partially unavailable | Warning banner with available data shown | `api-partial-error` |
| All APIs unavailable | Fallback to static data + explanation | `api-full-error` |
| API timeout (>10s) | Same as partial unavailable for timed-out source | (uses `api-partial-error`) |

---

## Required `data-testid` Attributes (new)

These are additive to the existing `data-testid` attributes from Phases 1-2.

| `data-testid` | Element | Purpose |
|----------------|---------|---------|
| `polling-location` | Polling place display | E2e tests verify polling data renders |
| `ballot-contests` | Ballot contests section | E2e tests verify contest data renders |
| `candidate-detail` | Individual candidate info block | E2e tests verify candidate enrichment |
| `data-loading` | Any section in loading state | E2e tests verify loading UX |
| `api-partial-error` | Partial API failure banner | E2e tests verify graceful degradation |
| `api-full-error` | Full API failure fallback | E2e tests verify fallback behavior |
| `data-attribution` | Data source footer | E2e tests verify attribution present |

---

## Customized Prompt Output (updated)

The pre-filled context block appended to the prompt now includes richer data from the APIs:

**Current (Phase 2):**
> Hi! I'm voting in **Texas**. My zip code is **77001**. The next election is the 2026 primary on March 3, 2026. [basic dates and links]

**Phase 3:**
> Hi! I'm voting in **Texas**. My zip code is **77001** (Harris County, TX-18, TX Senate District 13, TX House District 134). The next election is the 2026 primary on March 3, 2026. [dates, deadlines, early voting]. My ballot includes: [list of races and measures from Google Civic]. Key candidates: [names with brief voting record summaries from Vote Smart]. My polling place is [location from Google Civic]. Sample ballot: [link from Democracy Works]. Voter ID: Texas requires photo ID. [accepted forms, exceptions]. Full details: [state election office link].

The pre-filled context should be as complete as possible so the AI chatbot has maximum information to work with. But it must remain a single copy-pasteable block — no interactive elements or links that only work in a browser.

---

## What Gets Translated (Phase 2 continuity)

All new UI text introduced in Phase 3 must be available in both English and Spanish. Phase 4 will extend these translations to Vietnamese, Chinese, and Arabic — so the translation architecture should not hard-code a two-language assumption. Use the same i18n pattern established in Phase 2 (translation keys in a central translations file, language context provider). This includes:

- Polling location labels
- Ballot contest section headers
- Candidate detail labels ("Voting record," "Top donors," "Endorsements")
- Loading state text ("Loading election data...")
- Error messages (partial and full API failure)
- Data attribution footer
- All new elements in the pre-filled prompt context block

---

## Acceptance Criteria

- [ ] User enters a real zip code and sees accurate, current election data (not stub data)
- [ ] Data comes from all 5 APIs where available for that location
- [ ] Voter ID requirements display from static JSON for all 50 states + DC
- [ ] API keys are server-side only — never exposed in client bundle
- [ ] `.env.example` exists with all required variables documented
- [ ] Loading states appear while data is being fetched
- [ ] Progressive loading: sections appear as their data arrives
- [ ] If one API fails, the rest still display correctly with a non-alarming warning
- [ ] If all APIs fail, static fallback data displays with explanation
- [ ] API timeout at 10 seconds does not crash the app
- [ ] Customized prompt output includes enriched data (districts, ballot contests, candidate records)
- [ ] All new UI text is available in English and Spanish
- [ ] All new `data-testid` attributes are present
- [ ] Cache prevents redundant API calls for same zip code within session
- [ ] No API keys or user location data are logged, stored, or sent anywhere except to the respective API endpoints
- [ ] Existing e2e tests from Phases 1-2 still pass (no regressions)
- [ ] New e2e tests cover: loading states, progressive data display, partial API failure, full API failure fallback, candidate detail expansion

---

## What This Phase Does NOT Do

- Does NOT add an LLM chat window (that's Phase 5)
- Does NOT add new languages beyond English and Spanish (that's Phase 4)
- Does NOT create user accounts or persistent storage
- Does NOT send user data anywhere except to the public APIs listed above (and only the zip code / location needed for the query)
- Does NOT require paid API subscriptions

---

## E2e Test Considerations

The shared Playwright e2e test suite needs to be extended for Phase 3. New tests should cover:

- **Happy path with real data:** Enter a known zip code → verify all data sections populate
- **Loading states:** Verify skeleton UI appears before data arrives
- **Progressive loading:** Mock one API as slow → verify fast APIs display while slow one loads
- **Partial failure:** Mock one API as failing → verify other data displays + warning banner
- **Full failure:** Mock all APIs as failing → verify static fallback + explanation
- **Cache behavior:** Enter same zip code twice → verify second lookup is instant (no loading state)
- **Candidate detail expansion:** Click "View voting record" → verify enriched data appears

**Test environment note:** E2e tests should mock external API responses (not hit real APIs during CI). Use a consistent set of mock responses that mirror the real API response structures. This ensures tests are deterministic and don't fail due to API rate limits or data changes.

---

## Measurement Notes

Phase 3 metrics should capture the Phase 2 → Phase 3 delta, same as Phase 1 → Phase 2. Key signals to watch:

- **Cyclomatic complexity increase** — the data-access layer with multi-source aggregation, caching, and error handling is the most complex code the app has had. Does the workflow keep it well-structured?
- **Test coverage** — does the workflow generate tests for the data layer, or only for UI components?
- **Code duplication** — with 5 API integrations, does the workflow abstract shared patterns or copy-paste per API?
- **Bundle size** — API client code should be server-side only. If bundle size increases significantly, client-side API code is leaking.
