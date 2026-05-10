# Plan: Packet 6 — Backend Ingestion Pipeline

Slug: packet-6-backend-ingestion-plan
Status: active (Phase A shipped at `f3bcde5`; Phases B–G queued)
Tracked by: `.ai/project-briefs/voter-choice-alignment-engine-v2.md` § Phasing → Packet 6
Started: 2026-05-09
Last updated: 2026-05-10

## Phase A — shipped

- Drizzle ORM + `@neondatabase/serverless` wired against a 7-table schema (`candidates`, `candidate_offices`, `bills`, `votes`, `issue_tags`, `donor_aggregates`, `scorecard_meta`)
- Initial migration generated (`db/migrations/0000_first_crystal.sql`)
- Three GitHub Actions workflow skeletons (`ingest-federal`, `ingest-states`, `ingest-tag-bills`) wired to BWS secret pulls; placeholder no-op scripts that exit 0
- 6 unit tests on `db/client.ts` defensive sentinel
- 696 tests green, lint clean, build clean
- `scorecard_meta` is metadata-only — cite-don't-republish locked at the schema level
- `deploy.yml` deliberately NOT extended with `DATABASE_URL` / `OPENSTATES_API_KEY` pulls yet — those land in Phase F when `/api/alignment` exists

User actions before Phase B:
1. `DATABASE_URL=<neon-pooled-url> npm run db:migrate` — apply initial migration
2. `DATABASE_URL=<neon-pooled-url> npm run db:smoke` — confirm connection
3. Replace `<DATABASE_URL_BWS_SECRET_ID>` and `<OPENSTATES_API_KEY_BWS_SECRET_ID>` placeholders in the three ingest workflow files with the actual BWS UUIDs (before next Sunday's first cron)

## Context

Packets 1–5 of the v2 alignment-engine arc shipped. The last remaining packet — backend ingestion — is the only thing standing between the v2 product and a sustainable cost/latency profile at scale. Right now every alignment score requires the LLM to run `web_search` per (candidate, canonical issue) pair at session time. That's slow, expensive, and editorially inconsistent across runs (each session re-derives the same vote counts from scratch).

Packet 6 swaps the LLM web_search path for a deterministic backend lookup against pre-tagged votes ingested from public official sources. The structured `[ALIGNMENT_SCORES]` block schema and all v2 UI stay; only the source of truth flips.

User picked the most ambitious slice: **all 50 states + federal in Packet 6.1**, with empty-state messaging when the backend has no data for a given (candidate, canonical issue) pair.

Multi-week work, sliced into seven phases that each land in a green state.

## Recommended approach

### 1. Vote Smart alternatives (free official sources)

The honest answer: no single free source replaces Vote Smart Key Votes' editorial curation, but the combination below is functionally equivalent and avoids the licensing trap. We do the issue-tagging ourselves, once per bill, cached forever.

- **Federal votes** — **GovTrack** bulk JSON dumps (https://www.govtrack.us/data/) plus **Congress.gov** for canonical bill text and policy-area tags. Both are public-domain official records. No API key required for bulk; key is helpful for incremental updates.
- **State votes** — **OpenStates** (https://docs.openstates.org/), bipartisan project covering all 50 state legislatures. Free API, key required (we register `voter-choice` as a project). Fall back to state-specific scrape only if a state's coverage is thin.
- **Federal donors** — **FEC bulk** (https://www.fec.gov/data/browse-data/) plus **OpenSecrets reads** (cite-with-attribution, not bulk-storage) for industry/topic categorization.
- **State donors** — **FollowTheMoney.org** (https://www.followthemoney.org/) — free API, covers state-level finance.
- **Issue tagging** — done by us. Once per bill, an LLM batch job tags the bill against the canonical issue list (`canonicalIssues.ts`). Cost is amortized: ~$0.01–0.05 per bill, paid once, reused across every voter session forever. Re-tag only when the canonical-issue vocabulary changes.

Vote Smart paid tier is no longer required for v1. We can revisit if the issue-tagging quality demands it.

### 2. Advocacy scorecard licensing — cite-don't-republish

Bulk republishing scorecard data (NARAL, SBA Pro-Life, NRA, Sierra Club, ACLU, etc.) almost universally violates the publishing org's terms of use. Skip the audit by skipping the republishing.

- **Default UX** uses the official-record alignment computed from public votes and our own canonical-issue mapping. No scorecard data needed for the headline score.
- **Optional opt-in overlay** (deferred to Packet 6.2 or later): user toggles "show me through [Org]'s lens." The UI shows the org's score with attribution and a deep link to their scorecard page. Fair use citation, not republishing.
- **Bulk storage of scorecard records: forbidden** in this packet's schema. `scorecard_meta` carries only org metadata (name, URL, partisan lean, contact, notes). Per-vote scorecard tags fetched on-demand later, never bulk-mirrored.

This sidesteps the licensing problem entirely. The lawyer-y audit can happen later when (and if) scorecard depth becomes a bottleneck for user value.

### 3. Pipeline runner — GitHub Actions

- **Why GH Actions over a separate service:** free tier is generous, no new deploy target to manage, workflows are versioned alongside the app, long execution windows (6h job limit), parallel matrix support across states, secrets pipeline already wired to Bitwarden Secrets Manager (per `deploy.yml`).
- **Cron schedule** — weekly federal ingest (Sundays 7am UTC); state ingests Sundays 7:30am UTC; LLM batch-tagger Sundays 9am UTC. Donor ingest weekly (FEC) and weekly (FollowTheMoney).
- **Why not Vercel functions** — 60s execution limit on Hobby/Pro is too tight for batch ingest jobs.
- **Why not a separate Fly/Railway service** — extra deploy target, extra cost, extra moving parts. Not warranted at v1 scale.

The Next.js app reads from the database via lightweight API routes at request time. No app-side ingest code; ingest lives entirely in workflows + scripts.

### 4. Storage — Neon Postgres (free tier)

- **Why Postgres:** the data model is relational (bills → votes → tags; candidates → offices → votes; donors → contributions → buckets). SQL joins are the natural query shape for "show me votes by candidate X tagged with canonical-issue Y."
- **Why Neon specifically:** generous free tier (0.5 GB compute, 10 GB storage), serverless driver (`@neondatabase/serverless`) works in Vercel edge runtime, branching feature is useful for staging-style ingest verification, no cold-start penalty for our query shape.
- **Why not Vercel Postgres** — Vercel Postgres is Neon-backed but with stricter limits and less generous free tier. Pick the upstream.
- **Why not Cloudflare D1** — SQLite at the edge is great for read-heavy workloads but loses on the relational query side.
- **Why not stay on Upstash KV** — KV (Redis) is correct for the budget counter and polis aggregates we already wired in Packets 4–5; those stay. KV is wrong for relational vote/donor data — secondary indexes are awkward, joins impossible.
- **ORM:** **Drizzle** — TypeScript-first, lightweight, plays well with Neon's serverless driver. No magic; SQL is visible.

### 5. Slicing inside Packet 6.1

Seven phases. Each lands green and gives a checkpoint before continuing.

| Phase | Scope | Deliverable | Approx. time | Status |
|-------|-------|-------------|--------------|--------|
| A | Foundation | Drizzle setup; schema for bills, votes, candidates, candidate_offices, donors, issue_tags, scorecard_meta. Neon provisioning. GitHub Actions skeleton (no real ingest yet). | 1 day | ✅ shipped (`f3bcde5`) |
| B | Federal votes | GovTrack bulk ingest of House + Senate roll-call votes for the current Congress. Backfill prior session for incumbents. | 2 days | queued |
| C | State votes | OpenStates ingest for all 50 state legislatures, paginated. Matrix workflow: one job per state for parallelism. | 3–4 days | queued |
| D | Issue tagging | LLM batch-tag pipeline: per bill, generate `(canonical_issue, stance_lens)` tags using `canonicalIssues.ts` vocabulary. Cache forever. Backfill all ingested bills. | 2 days | queued |
| E | Donors | FEC bulk for federal; FollowTheMoney API for state; bucket categorization using existing `PATTERN_TAXONOMIES.md` vocabulary. | 2 days | queued |
| F | App cutover | New `/api/alignment` endpoint. Replace LLM web_search emit path in `BALLOT_PROMPT.md` Act 3 with: model calls `/api/alignment` via a custom tool, gets back deterministic data, emits `[ALIGNMENT_SCORES]` populated from the response. Empty-state when no data for a (candidate, canonical issue). | 2 days | queued |
| G | Verification | E2E test on three real candidates per scope (federal House, federal Senate, state legislature). Lint, test, build. Confirm cost savings via budget telemetry. | 1 day | queued |

**Total estimate:** ~13 working days. Likely longer in practice given OpenStates rate limits and per-state schema variations.

## Critical files / paths

**Already created in Phase A:**
- `db/schema.ts` — Drizzle schema for the 7 tables.
- `db/client.ts` — Neon serverless client wrapper with defensive sentinel.
- `db/migrations/0000_first_crystal.sql` — initial migration.
- `drizzle.config.ts` — Drizzle Kit config.
- `db/client.test.ts` — defensive failure mode tests.
- `scripts/ingest/federal-votes.ts`, `scripts/ingest/state-votes.ts`, `scripts/ingest/tag-bills.ts`, `scripts/ingest/_smoke.ts` — placeholder skeletons.
- `.github/workflows/ingest-federal.yml`, `.github/workflows/ingest-states.yml`, `.github/workflows/ingest-tag-bills.yml` — workflow skeletons.

**To be added in Phases B–G:**
- `scripts/ingest/federal-donors.ts` — FEC bulk ingest (Phase E).
- `scripts/ingest/state-donors.ts` — FollowTheMoney ingest (Phase E).
- `src/app/api/alignment/route.ts` — GET endpoint: `(candidateId, canonicalIssue, resolvedStance)` → `{ kept, total, contributingVotes }` (Phase F).
- `src/lib/server/alignment.ts` — query layer (Phase F).
- `src/lib/server/alignment.test.ts` (Phase F).
- `src/app/api/alignment/route.test.ts` (Phase F).

**To be modified in Phases B–G:**
- `docs/BALLOT_PROMPT.md` — Act 3 alignment-emit rules: replace `web_search`-based instructions with: "call the `lookup_alignment` tool with `(candidateId, canonicalIssue, resolvedStance)`; emit `[ALIGNMENT_SCORES]` populated from the response, OR `unavailable: { reason: '...' }` when no record." (Phase F)
- `src/app/api/chat/route.ts` — register a new `lookup_alignment` Anthropic tool, route tool calls to `/api/alignment` (Phase F).
- `.github/workflows/deploy.yml` — extend BWS secret pulls for `DATABASE_URL`, `OPENSTATES_API_KEY`, `FEC_API_KEY` (optional), `CONGRESS_GOV_API_KEY` (optional) — deferred from Phase A to Phase F.
- `src/lib/generated/ballotPromptEn.generated.ts` — regenerated (Phase F).
- `src/lib/generatePrompt.test.ts` — assertions for the new tool-based emit rule (Phase F).

## Reused functions / utilities

- `src/lib/canonicalIssues.ts` — canonical issue vocabulary; the join key for tags. Already exists from Packet 5; tag-bills script imports from here.
- `docs/PATTERN_TAXONOMIES.md` — donor bucket vocabulary; ingest scripts respect it.
- `docs/SOURCE_TIERS.md` — source attribution rules; alignment lookup respects tier labeling on stored sources.
- `src/lib/structured-blocks.ts` — `[ALIGNMENT_SCORES]` parser stays exactly as-is. Schema unchanged.
- `src/components/AlignmentScoreBanner.tsx` and `AlignmentDrilldown.tsx` — empty-state rendering already supports `unavailable: { reason }`.
- `src/lib/server/durable-store.ts` — Redis client pattern; new alignment.ts mirrors the same defensive failure mode.
- `.github/workflows/deploy.yml` — Bitwarden Secrets Manager pattern; new ingest workflows reuse the same pull approach.

## Verification

- `npm run lint` clean across new files.
- `npm run test` green; full suite grows by the alignment-route + alignment-query + ingest-script tests.
- `npm run build` succeeds.
- After Phase A: schema migration applies cleanly to a fresh Neon branch. *(✅ ready to apply)*
- After Phase B: a federal House member's roll-call votes are queryable in Postgres via a manual SQL probe.
- After Phase D: bills carry canonical-issue tags; sample query returns plausible counts.
- After Phase F: end-to-end smoke — Texas voter, two confirmed concerns, two candidate races, alignment banner renders with backend-derived scores; LLM no longer issues web_search calls for the alignment path (verified via budget telemetry showing zero web_search cost on the alignment turn).
- Empty-state path: a Wyoming state legislator with thin ingest coverage renders the explicit "Voting record not available" empty card.

## Out of scope (explicitly NOT in 6.1)

- Advocacy scorecard integration of any kind (deferred; addressed via cite-don't-republish later).
- Spanish path content for any new copy.
- Local races (school board, DA, judges, county commissioners) — coverage gap stays per Packet 1.
- Historical backfill beyond the current legislative session (one session is enough; deeper history is 6.2).
- Any UI changes to the alignment banner or drill-down.
- Any change to the polis viz, counter pipeline, or budget code.

## Accepted risks

1. **OpenStates per-state coverage variance.** Some states' data is thinner than others. Empty-state UX absorbs the gap. Phase G surfaces which states are thin so we can prioritize follow-up scrapers if coverage matters.
2. **LLM batch-tag quality.** A first pass will be ~90% accurate. Edge cases (procedural votes, motions to table) need refinement. Phase D includes a manual spot-check of 50 randomly-sampled tags before the data goes live.
3. **Free-tier Neon limits.** 10 GB storage covers a couple million rows comfortably; if we approach the limit, we partition older sessions into a cold archive.
4. **Cost shift, not elimination.** Web_search calls go away; LLM batch-tagging takes their place but is amortized across users. Net cost should drop sharply at any non-trivial traffic; lower at zero traffic.
5. **Ingest job failure modes.** A failed federal ingest doesn't block the app — alignment falls through to the empty state for affected races. Add Slack/email alerting on persistent ingest failures (Phase G).

## Suggested execution

Same shape as prior packets — Phase A's work packet at `.ai/work-packets/launch-vote-ingestion-pipeline.md` will extend with B–G as each phase starts. Each phase: subagents execute, verifier audits, commit + push + green tests before the next starts.
