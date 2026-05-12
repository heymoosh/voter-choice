# Product Brief: Real Ballot Data Integration (Phase 3)

## Product Vision
Extend the Voter Choice ballot research tool with a live data layer. Replace the 2-3 state static JSON stubs with real, current election information from free public APIs. The user entering any U.S. zip code now sees accurate, live election data — not stub data.

## Problem Statement
The current tool serves TX, CA, and NH with static JSON stubs. Users in other states get no data. Even stub-state users see outdated or incomplete information (no polling locations, no ballot contests, no candidate details).

## Goals
- Integrate Google Civic Information API for real election data (polling locations, ballot contests, candidates)
- Add Anthropic web_search for candidate enrichment (voting records, donors, endorsements)
- Create static voter ID JSON for all 50 states + DC (curated from NCSL + state sources)
- Build a clean data-access layer abstracting all API sources from UI components
- Add in-memory caching per zip code per session (1hr TTL)
- Progressive loading states (show data as it arrives)
- Graceful degradation when APIs fail (partial and full fallback)
- Extend i18n with all new text keys in English and Spanish

## Non-Goals (Phase 3)
- Additional languages beyond English and Spanish (Phase 4)
- LLM chat window (Phase 5)
- User accounts or persistent storage
- Paid API subscriptions
- Vote Smart / Democracy Works integration

## Success Criteria
- Real zip code shows live election data from Google Civic
- Candidate "View voting record" panel loads enrichment via Anthropic web_search
- Voter ID requirements display for all 50 states + DC
- API keys never exposed to browser (server-side only)
- .env.example committed with all required variable names
- Loading skeleton UI appears while data fetches
- Partial API failure shows warning banner with available data
- Full API failure shows static fallback with explanation
- All new UI text available in English and Spanish
- All new data-testid attributes present
- Cache prevents redundant calls for same zip within session
- Existing Phase 1-2 e2e tests still pass (no regressions)
