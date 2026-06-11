# Funding Data Sparseness — Diagnosis & Remediation Roadmap

> Status: diagnosis only. No source or behavior changes accompany this doc.
> Scope: the "Funding & influence / Money trail" section and the data behind it.

## TL;DR

The Money trail looks empty because of a **data-population gap, not a UI gap.**
The frontend (`FunderBars`) and the database schema (`donorAggregates` + the
`can*` enrichment tables) are both rich and already degrade gracefully when data
is missing. What's thin is the *data flowing into them*. In the reference
screenshot (a Texas House race, challenger "Jon Bonck · Republican · $1.5M
raised · FEC filing"), the candidate is sitting on the lowest of three data
layers — a single top-line FEC receipts figure with no breakdown behind it.

**Do not build new funding UI to fix this.** The interface elements already
exist. The work is ingest/coverage.

## How a money trail is assembled

A candidate's funding display is composed from three increasingly rich data
layers, read at request time and rendered by one component:

```
donor_aggregates (DB)  →  src/lib/server/donors.ts      (aggregate buckets)
                       →  src/lib/server/race-data.ts    (computeFundingMix, field assembly)
                       →  FunderBars (VoterChoiceApp.tsx) (render + graceful degradation)
```

**Read path** — `src/lib/server/donors.ts` aggregates per-candidate,
per-cycle, per-bucket dollar rows from `donor_aggregates` into a coalition
breakdown. `src/lib/server/race-data.ts` then derives `fundingMix`
(small/large/PAC percentages) via `computeFundingMix` and assembles the
`donorCoalition` / `totalRaised` / `donorUnavailable` fields the UI consumes.

**Render path** — `FunderBars` (`src/prototype/VoterChoiceApp.tsx:1302`) renders,
in increasing order of available data:
- a top-line "$X raised" with a `details pending` sub-label (`funding-sparse`),
- a small/large/PAC stacked funding-mix bar,
- a per-sector industry breakdown with color swatches and an "Outside named
  sectors" remainder,
- named issue-PACs with ✓ "aligns" / ⚠ "conflicts" alignment flags,
- peer-comparison rails ("2.0× more raised than …"),
- a PAC-coverage callout when named PACs don't fully account for PAC dollars.

It also handles every empty/partial state explicitly: `funding-unavailable`
(with a reason string, `:1303-1312`), `funding-sparse`
(`:1324-1350` — "Detailed donor breakdown is not available yet … we have total
receipts from filings, but not small donor, large donor, PAC, or sector
buckets"), and a silent `null` when there is no coalition at all (`:1313`).

The incumbent disclosure lives at `src/prototype/redesign/RepCard.tsx:633-686`;
challenger rows render top-line only **by design** at `:276-337`
(`{party} · {totalReceipts || "No funds reported"} · FEC filing`, no drill-down),
inside `ChallengersStrip` ("Running for this seat in 2026 · FEC filings · ranked
by funds raised", `:339-363`).

## Why the screenshot is sparse

Trace the Jon Bonck row:

1. The challenger has a `totalReceipts` value, so the row prints
   "$1.5M raised · FEC filing" (`RepCard.tsx:286-302`). That is the *only* funding
   field challenger rows ever show — intentional.
2. For the incumbent's Money trail, `donors.ts` finds only the legacy
   `total_receipts` bucket — no small/large/PAC rows. Its non-destructive
   fallback (`donors.ts:178-186`) keeps that single bucket rather than dropping
   it, so the candidate isn't left with nothing.
3. With no funding-mix buckets, `race-data.ts` produces `totalRaised` but no
   `fundingMix`, so `FunderBars` takes the `onlyTotalReceipts` branch
   (`VoterChoiceApp.tsx:1318-1350`) and shows the "details pending" message.

So the sparseness is structural to *which layer the data is on*, not to the UI.

## The three data layers and why each is under-fed

### Layer 1 — Top-line receipts only (the screenshot)
`donor_aggregates` has a single `total_receipts` bucket for the candidate.
Sufficient for a headline dollar figure; triggers `funding-sparse`.

### Layer 2 — FEC breakdown (small/large/PAC + employer/industry)
Implemented in `scripts/ingest/federal-donors.ts` against the OpenFEC API
(totals → small/large/PAC; `schedule_a/by_employer` → industry buckets via
`scripts/ingest/_bucket-mapping.ts`). It only populates candidates the script
has actually been run against, and only after FEC candidate IDs are resolved by
`scripts/ingest/federal-candidates.ts`. **Coverage is partial** — un-ingested
candidates fall back to Layer 1 or `no_donor_data`.

### Layer 3 — Named issue-PACs + curated enrichment

Two facts matter here, because it's easy to assume this layer *requires*
can2026.org. It does not.

- **FEC already exposes the named/issue-PAC data.** `federal-donors.ts:300-303`
  explicitly defers it: *"Issue-aligned PAC classification is a later
  enhancement; this is the unclassified total."* Today the ingest pulls only the
  aggregate "PACs" bucket plus the employer breakdown. The named-PAC material is
  available directly from FEC via:
  - `GET /committee/{id}/schedules/schedule_a/by_committee/` — committees (PACs)
    that contributed *to* the campaign, by name; and
  - the candidate `independent_expenditures` endpoint — outside spending
    *for/against* a candidate by named PACs/super-PACs, which is where groups
    like AIPAC (UDP) and Fairshake actually operate (independent expenditures,
    not direct contributions).

  What's missing is (a) ingest code to pull those endpoints and (b) a maintained
  PAC→issue classification map — the exact same pattern `_bucket-mapping.ts`
  already uses for employer→sector.

- **CAN2026 is merely the only *currently-wired* source** for named,
  issue-classified PACs with alignment flags and dark-money narrative. It is
  fully built (`scripts/ingest/can2026.ts`, schema tables `canDonorTrails`,
  `canDonorSectors`, `canFinanceMetrics`, `canIssuePacContributions` in
  `db/schema.ts`; surfaced via `src/lib/server/can-context.ts`) but **NOT
  deployed**: gated behind a terms-of-use confirmation (script header §6.7) and
  the empty `CAN2026_DISPLAY_ENABLED` flag (`.env.example:13`). Treat it as
  *optional editorial enrichment*, not a dependency.

## Coverage gaps that are by design (not bugs)

`donors.ts` resolution returns `candidate_not_resolved` /
`non_legislative_candidate` for governors, judges, county, and municipal races
(no `candidates` row to match), and `no_donor_data` when aggregates are empty.
These races will legitimately show no money trail until/unless a state-level
source covers them.

## Remediation roadmap (recommendation, sequenced)

### P0 — Measure coverage first
Run a coverage query against `donor_aggregates`: count candidates with a full
small/large/PAC breakdown vs. only `total_receipts` vs. none. This turns
"sparse" into a number and decides where effort actually goes. Cheap; do it
before anything else.

### P1 — Backfill the FEC breakdown (Layer 2)
Run `scripts/ingest/federal-candidates.ts` (FEC ID resolution + 2026 roster)
then `scripts/ingest/federal-donors.ts` across all federal House/Senate
candidates in the active cycle. This upgrades the common case from top-line to
small/large/PAC + sectors **with no UI change** — the existing `FunderBars`
branches light up automatically.

### P2 — Named issue-PACs from FEC directly (recommended over CAN2026)
Extend `federal-donors.ts` to pull `schedule_a/by_committee` and the candidate
`independent_expenditures` endpoint, and add a maintained PAC→issue map
(mirroring `_bucket-mapping.ts`) plus the alignment logic. This populates the
named-PAC UI (`isIssuePAC` slices + ✓/⚠ flags) **without** the can2026.org
terms-of-use gate.

### P2-alt (optional) — CAN2026 enrichment
If/when terms-of-use is cleared with the maintainer, run `can2026.ts` and set
`CAN2026_DISPLAY_ENABLED` to add curated narrative, cash-on-hand, and
OpenSecrets sectors as a *supplement* — not the primary path.

### P3 — State / down-ballot coverage
Use the existing `scripts/ingest/state-donors.ts` family for state legislative
races that warrant it. Won't cover executive/judicial/local (by design).

### P4 (optional UX)
Only if desired: soften the Layer-1 `funding-sparse` copy so partial coverage
reads as "data being expanded / in progress" rather than "broken."

### Execution strategy — sessions & model

Split the roadmap across sessions; the phases are independently shippable and
mix operational work with design-heavy code. Bundling a long, rate-limited
network ingest with a new classifier in one session makes it brittle and hard to
review.

| Phase | Kind of work | Session | Suggested model |
|-------|--------------|---------|-----------------|
| This doc | Writing | now | Opus |
| P0 + P1 | Run/verify existing ingest, monitor rate-limited FEC jobs | own session(s) | Sonnet (no new code) |
| P2 | New FEC endpoints + PAC→issue map + alignment | own session | Opus (design-heavy, review in isolation) |
| P2-alt | CAN2026 | separate; blocked on human terms-of-use decision | — |
| P3 | State coverage, per-state | separate session(s) | Sonnet |

Keep CAN2026 off the critical path.

## What is explicitly NOT the problem

- **Not the UI.** Every interface element for a full money trail already exists
  in `FunderBars` and degrades gracefully. Do not build new funding components.
- **Not the schema.** `donorAggregates` and the `can*` enrichment tables already
  model everything the roadmap needs.

The gap is ingest coverage (Layers 1→2) and one unbuilt ingest path (the FEC
named-PAC endpoints for Layer 3).

## Key references

- `src/prototype/VoterChoiceApp.tsx:1302-1350` — `FunderBars`, sparse/unavailable
- `src/prototype/redesign/RepCard.tsx:276-337`, `:633-686` — challenger rows, disclosure
- `src/lib/server/donors.ts:178-186` — `total_receipts` fallback
- `src/lib/server/race-data.ts` — `computeFundingMix`, donor field assembly
- `src/lib/server/can-context.ts` — CAN2026 funding surfacing
- `db/schema.ts` — `donorAggregates` + `can*` tables
- `scripts/ingest/federal-candidates.ts`, `federal-donors.ts` (`:300-303`),
  `can2026.ts`, `_bucket-mapping.ts`, `state-donors.ts`
- `.env.example:13` (`CAN2026_DISPLAY_ENABLED`), `docs/CAN2026_ENRICHMENT_SCHEMA.md`
