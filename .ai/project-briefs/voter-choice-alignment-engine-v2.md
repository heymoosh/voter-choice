# Project Brief: Voter Choice Alignment Engine — v2

Slug: voter-choice-alignment-engine-v2
Status: active
Tracked by: this brief is the canonical reference until the v2 launch packet sequence completes.
Started: 2026-05-09
Last updated: 2026-05-09

## Original Intent

Add an **alignment score** as the new headline metric on every candidate card — matching the user's stated stance on each issue against the candidate's actual voting record and donor pattern, not their stated platform. Alignment-on-actions is the moat: ISideWith and VoteEasy align on platform (gameable). We align on actions (rare, hard to fake). The score sits **above** the existing four-pattern dashboard. Patterns become drill-down evidence under the score. National scope (federal + state legislators), local-races as honest gap, anonymous aggregate counters power a polis-style end-of-session overlap visualization.

## Original User Intent

User pasted "Voter Choice — Alignment Engine Direction" doc plus a Polis-style overlap viz spec, and corrected the AI co-author's mistakes about contradiction with the existing codebase. v2 is **additive** on top of the v1 legible-patterns dashboard, not a rewrite. Verbatim driving principle: *"did this person vote for or against your side on this issue? That's it."* The score is a fact match; the disclaimer ("AI can make errors, double-check") goes near the score because that's the only honest framing of LLM-driven alignment scoring.

## Intent Interpretation

The v1 dashboard's principle ("the pattern is the answer; let the voter interpret") is preserved as the *evidence layer.* The new alignment score is one extra metric on top, framed as a factual count against the user's stance, not an editorial recommendation. The four patterns remain — they become the drill-down that proves the score.

National scope expansion is mechanical (state fixtures, generalize the TX runoff gate). The polis endgame is the depolarization payoff. The privacy posture evolves from "we save nothing" to "we save anonymous aggregate counters only — no individual record exists, even under subpoena."

## Goals

- Alignment score per (user-issue, candidate) pair, computed from real voting records and (where applicable) donor patterns.
- Free-text concern entry + multi-select chips coexisting; free-text gets a disambiguation gate before scoring.
- Drag-rank issue prioritization (up to 3 issues); rank weights the score.
- Drill-down from score to underlying votes, with source-cited line items.
- National scope: federal + state legislators across the 50 states.
- Local races surfaced as honest gap with explicit "here's why we don't have data" copy.
- Polis-style aggregate visualization at the end of every session, gated by per-(county, primary) sample threshold.
- Privacy promise that holds: no individual data ever stored; counters only; even subpoena cannot reveal what one user answered.
- Same anonymized → reveal → pick flow as v1.

## Domain / Business Rules

Rules:
- Alignment score is a **factual count**, framed as: "voted with your side N of M times on [issue]." Not an editorial verdict.
- A disclaimer ("AI can make errors, double-check what matters") renders once at the top of the dashboard and once at the bottom of every drill-down panel. Not on every card.
- The four-pattern dashboard (donor coalition, endorsements, platform alignment, retrospective) stays as the evidence layer under the score. Nothing is removed from v1.
- Anonymized → reveal → pick stays for both the score and the patterns. The score is anchored to "Candidate A" until reveal.
- No individual user record is ever stored. Only aggregate counters per (county, primary, issue, picked-candidate, top-issue-rank) bucket.
- Counters increment at end of session, with no user identifier, no timestamp tied to identity, no IP.
- Privacy copy: "Even with a subpoena, we couldn't tell anyone your answers. The records don't exist to compel."
- The polis viz unlocks per (county, primary) bucket only after 200+ sessions in that bucket. Below threshold, show a placeholder with an unlock-counter and a soft viral hook.
- Local races (school board, DA, judges, city council, county commissioners) ship as a known gap with explicit "we don't have voting data for this race" copy. Federal + state coverage carries v2.
- Hold the **no-labeled-guess** line for both candidate races AND propositions. The model never says "you'd probably want this." It states facts; the voter decides.
- Single chat prompt with explicit branching for candidate races vs ballot measures. Pull conversational moves from `docs/archive/BALLOT_PROMPT_v1_2026-05-08.md` for the proposition path.
- Vote Smart "Key Votes" is the spine for issue tagging. Advocacy scorecards (NARAL, SBA Pro-Life, NRA, Sierra Club, ACLU, etc.) are an opt-in layer with explicit source attribution. When two scorecards conflict on the same vote, both render side-by-side.

Assumptions:
- Vote Smart, FEC, OpenSecrets, and FollowTheMoney all have public-data ingestion paths (free API or scrapeable). Subject to a licensing audit before scorecard data is republished.
- Current LLM-in-the-loop architecture handles per-candidate work fine at current traffic. Backend pipeline ships in a later phase to take cost/latency pressure off; not blocking v2 launch.
- Drag-and-drop ranking on `@dnd-kit/sortable` is acceptable for mobile (the deleted `IssueRanker.tsx` already used this pattern; the dependency is still in `package.json`).

User-confirmed decisions:
- Alignment score on top of dashboard, not in place of it.
- Backend pipeline is worth the infra investment.
- National scope; local stays a known gap.
- Drag-rank for issue priority. Cap at 3 issues.
- Free-text and chips coexist; free-text gets the disambiguation gate.
- Single prompt with explicit candidate vs proposition branching.
- Hold no-labeled-guess for propositions same as candidates.
- Anonymized → reveal flow stays.
- Disclaimer at top of dashboard plus bottom of each drill-down panel.
- Polis viz uses anonymous counters only; no external poll bootstrap; threshold-gate to 200+ per bucket.
- Privacy posture rewrites: "we save anonymous aggregate stats only" replaces "we save nothing."

Open business questions:
- Vote Smart API access terms — public free API or scrape-only? Affects backend pipeline budget.
- Advocacy scorecard licensing — which orgs allow republishing of their tags? Some explicitly forbid it. Audit before designing UX that displays them.
- Thin-record threshold — at what number of votes does a score become statistically meaningless? Show "based on N votes" labeling without hiding, but pick a floor (e.g., 5 votes minimum to compute at all).
- Polis dimension-reduction algorithm — PCA (simple, interpretable), UMAP (better cluster shape), or t-SNE (showy but unstable)? Defer until viz work begins.

## Commercial Readiness

Target readiness: launch (ships to production same as v1)
Applicable lanes:
- Product UX (alignment score visual hierarchy, drag-rank ranking, drill-down navigation)
- Privacy / data (anonymous counter store, polis viz architecture, privacy copy rewrite)
- API/contracts (Vote Smart + FEC + OpenSecrets ingestion contracts, advocacy scorecard licensing)
- Persistence/recovery (anonymous counter durability, no-individual-record verification)
- Observability/support (counter-write metrics, polis-threshold telemetry)

User decisions:
- Vote Smart paid tier vs scrape vs partner deal — needs decision before backend pipeline phase.
- Advocacy scorecards: which to integrate v1, scorecard licensing review.

Known risks:
- Privacy posture change — "we save aggregate stats" reads worse than "we save nothing" if not framed carefully. Subpoena callout is the trust anchor; copy must lead with it.
- Backend pipeline scope creep — full ingestion of 50 states' legislators is a real engineering project.
- Score interpretation drift — voters may treat the score as authoritative even with disclaimers. Drill-down legitimacy is the only defense.

## Operational Reproducibility

Setup path:
- v1 setup carries forward (`npm install`, `.env.local` with Anthropic key + Civic API key)
- Phase 4 backend pipeline adds a separate ingestion service with its own setup (TBD)

Provider/config strategy:
- Anonymous counter store: Vercel KV / Upstash Redis (the durable budget store deferred earlier becomes part of v2 scope)
- Vote/donor ingestion: separate service with its own provider; not in the Next.js app

Database/migration strategy:
- Counters are append-only with idempotent merge; no schema migration needed beyond key-namespace versioning
- Vote-tag store: Postgres or Cloudflare D1 — deferred to phase 4 packet

CI/deploy checks:
- Existing `.github/workflows/deploy.yml` continues to apply; new ingestion service gets its own pipeline if it lives in a separate repo

Manual steps:
- Provisioning the durable counter store on Vercel KV (~10 minutes, one-time)
- Vote Smart account / API key setup if we go API route
- Advocacy scorecard licensing review before each scorecard integration

## Decisions Made

- **Alignment score sits above the four-pattern dashboard, not in place of it.** Score = headline; patterns = evidence. — Preserves the v1 thesis ("pattern is the answer") as the drill-down legitimacy layer for the score.
- **Backend ingestion pipeline ships in a later phase.** v2 launches with LLM-driven score (web_search per session) and migrates to pipeline lookups as ingestion matures. — Avoids blocking the user-facing v2 on multi-week backend work.
- **Drag-rank for issue priority, capped at 3.** — Reuses `@dnd-kit/sortable` already in `package.json`; matches the pattern voters expect from the deleted `IssueRanker`.
- **Free-text + chips coexist.** Free-text gets the LLM-driven disambiguation gate; chips for fast paths. — Lowers friction for casual users, raises specificity for engaged users.
- **Single chat prompt with explicit candidate vs proposition branching.** Proposition path borrows conversational moves from the archived v1 prompt; same no-labeled-guess discipline as candidates. — One prompt, less context bloat than two.
- **Anonymized → reveal → pick stays.** Score doesn't break anonymization (you don't know how each rep voted by name; the score against your stance is just a count). — Kept the v1 "show the work before the name" instinct.
- **Disclaimer placement: top of dashboard once + bottom of each drill-down panel.** — Loud where it should be (verification surface), quiet where it doesn't need to repeat (every card).
- **Polis viz uses synthetic dots from aggregate distribution.** No individual records; honest framing as "shape of your county, not a record of who voted." — Holds the privacy line without losing the depolarization moment.
- **Privacy posture evolves: "we save nothing" → "we save anonymous aggregate stats only."** Subpoena-line is the trust anchor. — Honest about the new feature; less honest if we kept the old copy.
- **Hold the no-labeled-guess line for propositions.** The archived v1 prompt's "if you infer my likely lean, label it as a guess" is **rejected** for the same reason we rejected matchSummary in legible-patterns. — Editorially loaded.

## Rejected Options

- **Replace the four-pattern dashboard with score-only display.** — Loses the evidence drill-down legitimacy; gives bias accusations more surface area, not less.
- **Weight slider for issue prioritization.** — Too cumbersome on mobile; no clear stop-points.
- **Tap-order ranking.** — Messy UX per user feedback; drag-rank is cleaner and the pattern users expect.
- **Tiered buckets ("must" vs. "nice").** — Less expressive than a 1-2-3 ranking; same UX overhead.
- **Two separate prompts for candidate vs proposition flows.** — Doubles context overhead and risks divergent voice; single prompt with branching keeps coherence.
- **LLM-out-of-the-per-candidate-loop architecture for v2 launch.** — Right at scale, premature now. Defer to phase 4.
- **Bootstrapping polis viz with external polling data.** — Honesty over impressive sample size; threshold-gate is the right answer.
- **"Labeled guess" framing for propositions.** — Same editorial-loading we rejected for candidates.

## Current State

v1 (legible-patterns dashboard) shipped on `launch/production` at commit `bb355f8` (deployed 2026-05-09 via run [25590037799](https://github.com/heymoosh/voter-choice/actions/runs/25590037799)). Tests: 384 passing. The dashboard is live with: four-pattern Act 3 (`RacePatterns.tsx`), values tag UI with chip + free-text custom (`ValuesTagSelector.tsx`), `[VALUES_TAG_REQUEST]` and `[RACE_PATTERNS]` block parsers (`structured-blocks.ts`), anonymized → reveal → pick flow, sticky tab-close banner, beforeunload handler, PDF upload via `pdfjs-dist@5.7.284`, $50/mo budget cap with reserved handoff token allowance.

Texas-only today: `getStateData.ts` ships only TX state data; `BallotToolClient.tsx` `requiresTexasRunoffGate` is TX-specific; `PATTERN_TAXONOMIES.md` retrospective metric vocabulary is TX-flavored; Harris County is the only county in `countyResources`.

Anonymous aggregate counter store does not exist. Backend vote/donor ingestion does not exist. LLM-driven alignment score does not exist. Polis viz does not exist. Drag-rank issue priority does not exist (the prior `IssueRanker.tsx` was deleted; `@dnd-kit/sortable` remains in `package.json`).

## System Ownership Map

Domain concerns (existing, owners stable):
- Ballot prompt (Acts 1, 1.5, 2, 3, propositions, voice rules) — `docs/BALLOT_PROMPT.md`
- Pattern taxonomies — `docs/PATTERN_TAXONOMIES.md`
- Source tier list — `docs/SOURCE_TIERS.md`
- Per-state election data — `src/lib/getStateData.ts`
- Texas-specific runoff gate — `src/components/BallotToolClient.tsx`
- Candidate dashboard render — `src/components/RacePatterns.tsx`
- Values tag UI — `src/components/ValuesTagSelector.tsx`
- Structured block parsers — `src/lib/structured-blocks.ts`
- Chat dispatch + render branches — `src/components/ChatPanel.tsx`
- Budget tier model + handoff token reservation — `src/lib/server/budget.ts`

NEW concerns that need owners (to be established by upcoming work packets):
- **Topic mapping (concerns → canonical issues)** — owner: a dedicated server route + LLM call, cached at session level. Not invented yet.
- **Anonymous aggregate counter store** — owner: Vercel KV (durable Redis) keyed by `voter-choice:counters:{county}:{primary}:{issue}:{candidate-pick}`. Not invented yet.
- **Polis-style aggregation + visualization** — owner: new component `PolisOverlay.tsx` plus a server route that returns synthetic dot data from aggregate counters.
- **Vote ingestion pipeline (Vote Smart, FEC, OpenSecrets, FollowTheMoney, advocacy scorecards)** — owner: separate service (TBD: in this repo as `src/server/ingestion/...` or as a sibling repo).
- **Disambiguation gate UI** — owner: extension of `ValuesTagSelector` (free-text path) plus a new `[CONCERN_INTERPRETATION]` structured block.
- **Drill-down evidence panel** — owner: extension of `RacePatterns` or a sibling component `AlignmentDrilldown.tsx`.

Known overlaps:
- The four-pattern `platformAlignment` ratio in `RacePatterns.tsx` and the new alignment score are conceptually adjacent: both compare actions (votes) to something (a platform vs a user-stated stance). Visual treatment must distinguish them clearly to avoid double-display confusion.

Open gaps:
- National scope: 49 states' worth of registration deadlines, voter ID rules, county lookup links, runoff rules. Some live on Vote.org.
- Cost/licensing of advocacy scorecard data.
- Threshold for "thin record" alignment scoring.

Execution packet rules every related work packet must preserve:
- Never present the alignment score as a recommendation. Only ever as "voted with your side N of M times."
- Never store any individual user record. Counters only.
- Never drop or hide a scorecard conflict. If two sources tag the same vote oppositely, render both.
- Never invent a vote or a donor; surface the data gap explicitly per pattern.
- Hold the privacy posture in user copy: subpoena-callout is non-negotiable.

## Phasing — recommended packet order

Decomposing the brief into ship-able work packets. Each is its own packet under `.ai/work-packets/`.

**Packet 1 — National scope generalization (foundation, no new product surface).**
Generalize the TX runoff gate, factor county resources into per-state config, scaffold state data fixtures for the top 10 states by voter population, add explicit "local races: known gap" copy in the prompt + UI, retire the TX-flavored examples in the prompt. Low risk; clears the deck.

**Packet 2 — Drag-rank issue prioritization + free-text disambiguation gate.**
Reintroduce drag-rank ranking in `ValuesTagSelector` (cap 3, reuse `@dnd-kit/sortable`). Add free-text concern entry alongside chips. Add `[CONCERN_INTERPRETATION]` block + UI for "we interpreted this as X — edit?" confirmation. Update prompt to emit the block and wait for confirmation before proceeding.

**Packet 3 — Alignment score (LLM-driven, no backend pipeline).**
New `[ALIGNMENT_SCORE]` block schema (per-candidate, per-issue: kept count, total, contributing votes with sources). Render the score above the four-pattern dashboard on each candidate card. Drill-down: tap score → expand a panel listing the votes that built it. Disclaimer at top of dashboard + bottom of drill-down. This is the visible v2 feature and ships before the backend pipeline.

**Packet 4 — Single-prompt branching for propositions.**
Extend Act 3 (Propositions) section with conversational moves from `docs/archive/BALLOT_PROMPT_v1_2026-05-08.md` (one-sentence summary, what yes/no does, one tradeoff question). Hold the no-labeled-guess line. Routing logic in the prompt detects race type and switches.

**Packet 5 — Anonymous aggregate counter store + polis viz.**
Provision Vercel KV for durable storage. Counter-write at session end. Threshold-gated polis visualization with synthetic dot generation from aggregate distribution. Privacy copy rewrite (Act 1.5 briefing, tab-close banner, sticky banner). Subpoena-callout copy. Consensus panel.

**Packet 6 — Backend ingestion pipeline.**
Vote Smart + FEC + OpenSecrets + FollowTheMoney ingest jobs. Pre-tagged vote storage with canonical issue tags. Deterministic lookup endpoint. Migrate alignment score from LLM web_search → backend lookup. Optional advocacy scorecard layer with explicit source labeling. Reduces cost and latency at scale.

**Order rationale:**
- Packets 1, 2, 3 ship the user-visible v2 feature without backend dependency.
- Packet 4 is small; can ride alongside 2 or 3 if convenient.
- Packet 5 is the depolarization payoff and the privacy-posture evolution; not blocking the score launch.
- Packet 6 is infrastructure that scales but doesn't block v2 launch.

## Work Packets

- `.ai/work-packets/launch-legible-patterns-act-2-and-3.md` — v1 dashboard, **shipped** 2026-05-09 at `bb355f8`
- (upcoming) `.ai/work-packets/launch-national-scope-generalization.md` — Packet 1
- (upcoming) `.ai/work-packets/launch-issue-ranking-and-concern-disambiguation.md` — Packet 2
- (upcoming) `.ai/work-packets/launch-alignment-score-llm-driven.md` — Packet 3
- (upcoming) `.ai/work-packets/launch-proposition-prompt-branching.md` — Packet 4
- (upcoming) `.ai/work-packets/launch-anonymous-counters-and-polis-viz.md` — Packet 5
- (upcoming) `.ai/work-packets/launch-vote-ingestion-pipeline.md` — Packet 6

## Open Questions

- Vote Smart API access tier and licensing (affects packet 6).
- Advocacy scorecard licensing audit (affects packets 3 and 6 for scorecard layer).
- Statistical floor for "thin record" alignment scoring (affects packet 3 — pick a number, e.g., 5 votes minimum).
- Polis dimension-reduction algorithm choice — PCA, UMAP, or t-SNE (affects packet 5; defer until viz work begins).
- Privacy posture copy review — "we save anonymous aggregate stats only" reads worse than "we save nothing." Subpoena-callout placement and tone need a sign-off pass.
- Disambiguation gate friction tolerance — modal vs. inline expansion vs. progressive disclosure (affects packet 2; recommend inline expansion to keep the conversation feel).

## Next Steps

1. Approve this brief.
2. Pick which packet to start with — recommend **Packet 1 (national scope)** because it unblocks everything else and is low-risk.
3. I write the work packet for the chosen phase, then execute via the same orchestrator + subagent + verifier pattern used for v1.
