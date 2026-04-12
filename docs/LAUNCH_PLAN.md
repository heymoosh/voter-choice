# LAUNCH_PLAN.md — Ship Voter Choice Today (MVP)

**Date:** 2026-04-12
**Goal:** Launch a working ballot research tool with an on-site AI chat experience for Texas voters.
**Scope:** MVP of all phases, scoped to Texas only. Chat is the default. Copy/paste is the budget-exhaustion fallback.

---

## What "MVP of All Phases" Means

| Phase | Full Vision | Today's MVP | Deferred |
|-------|-------------|-------------|----------|
| **1** (Core) | Zip → state info → prompt output | ✅ Already built on `run3/spec-kit` | — |
| **2** (i18n) | Spanish language support | ✅ Already built on `run3/spec-kit` | — |
| **3** (Real data) | 5 public APIs, 50 states + DC, candidate records | TX static data + Google Civic API (polling locations, early vote sites). Address → "Get Directions" link to Google Maps. | 50-state expansion, candidate enrichment APIs, embedded maps |
| **4** (Languages) | Vietnamese, Chinese, Arabic + RTL | Skip. EN + ES is enough for TX launch. | Full 5-language support, RTL layout |
| **5** (Chat + outputs) | LLM chat, downloadable ballot, voter profile | ✅ Build today — this is the product. | Polish, edge cases |

---

## Decision Log

| Decision | Choice | Why |
|----------|--------|-----|
| Base branch | `run3/spec-kit` | 159 unit tests, 91.6% coverage, 100 Lighthouse, Spanish i18n, cleanest architecture |
| New branch | `launch/production` from `run3/spec-kit` | Preserves experiment data on other branches |
| Default path | **Chat on-site** (Path A from Phase 5 spec) | The chat IS the product |
| Fallback path | Copy/paste prompt (Path B) | Activates when $20/month budget is exhausted |
| LLM | Claude Sonnet (`claude-sonnet-4-6`) via Anthropic API | Cost-effective, high quality |
| Budget | $20/month hard cap via Anthropic Console | Per Phase 5 spec |
| Data scope | Texas only — all 2026 elections (May 2 local, May 26 runoff, Nov 3 general) | Ship today, expand later |
| Google Civic API | Polling locations + early vote sites via address lookup | Free (25K queries/day). Directions via Google Maps deep link, not embedded map. |
| Google Maps | **Directions link only** — `https://www.google.com/maps/dir/?api=1&destination={address}` | No embed, no Maps JS API, no API key needed for links. One tap on mobile. |
| Returning voter UX | Voter profile upload (Session 4) — simple file upload, AI resumes from profile | **Deferred:** Active Intelligence sidebar, matched topics, correlation scores, nearby polling map. Design screens preserved in `docs/UI_REFERENCE/` for v2. |
| Secrets | Bitwarden SM → GitHub Actions → Vercel (automated) | GitHub repo secrets configured: `BW_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Pipeline pulls `ANTHROPIC_VOTER_API` and `GOOGLE_CIVIC_API_KEY` from Bitwarden SM at deploy time. |
| Deployment | Vercel via GitHub Actions | Push to `launch/production` triggers auto-deploy |

---

## Graceful Handoff System

The most important UX decision: when the budget runs low, existing users are never cut off. New users absorb the reduction first.

**Budget math:** ~$1.20/conversation, ~$0.07/handoff, ~16 full conversations per month at $20.

**Two-threshold system:**

| Threshold | New users | Existing conversations |
|-----------|-----------|----------------------|
| 0-70% | Normal | Normal |
| 70-80% | Normal + subtle notice | Normal + subtle notice |
| **80-90%** | **See copy/paste flow as primary** (soft close) | **Continue normally** (protected) |
| **90%** | Copy/paste only | **Handoff triggered** — AI wraps up warmly |
| 100% | Copy/paste only | Client-side fallback handoff |

**At 80%** — stop admitting new conversations. New visitors see "Our AI chat is at capacity this month, but you can still research your ballot" with the copy/paste flow. Never a broken or disabled chat. A working product.

**At 90%** — trigger handoffs for all active conversations. The API injects a system instruction and the AI generates: ballot-so-far (covered + remaining), voter profile, and session handoff. The user sees "Here's everything we've worked on so far" with three outputs:
1. **Your Ballot So Far** — printable, covered races + "Races Remaining"
2. **Your Voter Profile** — downloadable .txt
3. **Continue Where You Left Off** — one "Copy" button, self-contained prompt, paste anywhere

**At 100%** — backstop. Client-side assembles a handoff from conversation history in browser memory if the API can't.

The user does zero work to continue. One copy, one paste, they're back.

---

## Session Execution

See `docs/SESSION_PROMPTS.md` for the exact prompts to paste into each Claude Code session.

| Session | Duration | What | Depends on Gemini? |
|---------|----------|------|---------------------|
| 1: Branch + cleanup | 20-30 min | Strip experiments, fix TX data, CI/CD | No |
| 2: Chat API route | 45-60 min | Backend: streaming, rate limiting, budget, handoff | No |
| 3A: Chat UI + design | 40-50 min | Chat component, streaming, design system, privacy notice | **Yes — fold Gemini/Stitch feedback here** |
| 3B: Civic API + polling | 30-40 min | /api/civic route, address input, polling location display, fallback | No |
| 3C: Two-path + budget | 45-60 min | Copy/paste path, budget degradation UI, handoff package, rate limits | No |
| 4: Ballot + profile | 30-45 min | Downloads, uploads, parsing | No (minor Gemini influence) |
| 5: Legal + deploy | 30-45 min | Privacy, terms, metadata, ship it | No |

**Start Sessions 1-2 now. Wait for Gemini feedback before Session 3.**

---

## Secrets Setup

### Already Done ✅
- GitHub repo secrets: `BW_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Bitwarden SM: `ANTHROPIC_VOTER_API` and `GOOGLE_CIVIC_API_KEY` stored
- Anthropic Console: $20/month hard spending cap set

### How Deployment Works
Push to `launch/production` → GitHub Actions → pulls `ANTHROPIC_VOTER_API` and `GOOGLE_CIVIC_API_KEY` from Bitwarden SM → deploys to Vercel with keys injected.

### Adding Future API Keys
1. Add new key to Bitwarden SM
2. Add key name to `bws` pull step in `.github/workflows/deploy.yml`
3. Push. Done.

### For Local Dev
- `bws run -- npm run dev` (recommended) or `.env.local` with `ANTHROPIC_VOTER_API=sk-ant-...` (gitignored)
- `.env.example` documents required vars with placeholder values

---

## API Strategy

**Decision:** Drop the original Phase 3 five-API plan. Use a simpler hybrid approach.

### Original Plan (Phase 3 Spec) — Retired
The Phase 3 spec called for 5 API integrations: Google Civic, Democracy Works, Vote Smart, OpenStates, OpenFEC. This is overkill for a Texas-first product:
- **Democracy Works** — painful sign-up, possible approval lag, and everything it provides for Texas is publicly available from VoteTexas.gov and the SOS.
- **Vote Smart / OpenStates / OpenFEC** — candidate enrichment data. Sonnet already has this in its training data and researches it conversationally during the chat. Pre-fetching it into the UI is a nice-to-have, not a need.

### v1 Plan (Launch): Google Civic + Own Data + County Fallbacks

**One live API per session:** Google Civic Information API (free, 25K queries/day)
- Resolves address → specific ballot contests, districts, polling places, early vote sites
- This is the only thing that requires a per-user API call
- **Polling location display:** Show polling place name, address, hours. Link to Google Maps directions via `https://www.google.com/maps/dir/?api=1&destination={URL_ENCODED_ADDRESS}` — no Maps API key needed, opens natively on mobile.
- **Early vote sites:** Same treatment — name, address, dates, directions link.
- **Fallback:** If Civic API fails, show county elections website link from TX.json. Never break the page.

**Your own curated data (JSON files, not a database):**

Extend the existing `TX.json` schema with:

| What | Source | Refresh cadence |
|------|--------|----------------|
| Voter ID rules | VoteTexas.gov "Need ID?" page | Per legislative session |
| Early voting rule patterns | VoteTexas.gov early voting page | Per legislative session |
| Vote-by-mail eligibility | VoteTexas.gov + TX SOS ABBM page | Per legislative session |
| Election dates & deadlines | TX SOS "Important Election Dates" | Per election cycle |
| Exact early voting windows | VoteTexas.gov per election | Per election cycle |
| County ballot/location links | HarrisVotes.com (start with Harris) | Per election cycle |

**County-level resources (new addition to data model):**
```json
"counties": {
  "harris": {
    "countyName": "Harris County",
    "ballotLookupUrl": "https://www.harrisvotes.com/WhatsOnMyBallot",
    "pollingPlaceUrl": "https://www.harrisvotes.com/Polling-Locations",
    "earlyVotingLocationsUrl": "https://www.harrisvotes.com/Early-Voting",
    "countyElectionsUrl": "https://www.harrisvotes.com/",
    "lastVerified": "2026-04-12"
  }
}
```

**Candidate research:** Sonnet handles this in the chat, drawing from its training data (which includes VoteSmart, OpenSecrets, Ballotpedia, etc.). No API needed for v1. Vote Smart / OpenStates / OpenFEC APIs become relevant when you want structured candidate data displayed in the UI (expandable panels, voting record cards) — that's a v2+ UI feature.

**When to trust Google Civic vs county fallback:**
Call Google Civic first, display what it returns, always show county fallback link alongside with "Verify at [county election office]." Don't try to merge or reconcile data sources.

### Scaling Beyond Texas
At 1 state, curating data manually is trivial. At 10+ states, the maintenance burden grows. That's when Democracy Works and the other APIs start making sense — they normalize cross-state data so you don't have to learn 50 different SOS website structures.

### API Keys
| Secret | Where | Status |
|--------|-------|--------|
| `ANTHROPIC_VOTER_API` | Bitwarden SM | ✅ v1 — powers the chat |
| `GOOGLE_CIVIC_API_KEY` | Bitwarden SM | ✅ v1 — polling locations, early vote sites |

### Deferred to v2+
- **Embedded Google Maps** — directions link covers 90% of the value. Embedded map with drive times, real-time transit, etc. is a v2 feature if usage warrants it.
- **Active Intelligence sidebar** — returning voter experience with matched topics, correlation scores, personalized recommendations. Design screens preserved in `docs/UI_REFERENCE/resumed_research_returning_voter/` for reference.
- **Candidate enrichment APIs** (Vote Smart, OpenStates, OpenFEC) — structured candidate data panels in the UI. Chat handles this conversationally for v1.
- **Democracy Works** — cross-state election data normalization. Becomes relevant at 10+ states.
