# Work Packet: launch-alignment-score-llm-driven

Status: completed — LLM-driven alignment score banner + drill-down shipped (commit a528c72)
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `.ai/project-briefs/voter-choice-alignment-engine-v2.md` § Phasing → Packet 3.
Branch: launch/production

## Intent

Ship the visible v2 feature: an alignment score above each candidate card in the Act 3 dashboard. Score frames as a factual count — "voted with your side N of M times on [issue]" — across the user's confirmed concerns from Packet 2. Drill-down expands to the contributing votes with sources. The model computes scores via web_search per (candidate, canonicalIssue) pair. Backend pipeline ships in Packet 6 to scale this off the LLM.

## Original User Intent

From the brief: "alignment based on actual votes and donor patterns, not stated positions." User decision: "did this person vote for or against your side on this issue? That's it." Disclaimer ("AI can make errors, double-check what matters") at top of dashboard + bottom of every drill-down panel.

## Intent Interpretation

Alignment score is a per-(candidate, canonical-issue) ratio computed by the LLM from voting records. It surfaces above the four-pattern dashboard but doesn't replace it — patterns become drill-down evidence under the score. Per concern in `[VOTER CONFIRMED CONCERNS]`, the model emits a per-candidate score with contributing votes.

A separate `[ALIGNMENT_SCORES]` block (one per race, alongside `[RACE_PATTERNS]`) keeps `[RACE_PATTERNS]` lean. The two blocks render as one combined dashboard in the UI.

## Business Logic

Rules:

- Score is **factual count**: "voted with your side N of M times." Never a verdict, never a recommendation.
- Score appears above the four-pattern dashboard for each candidate. Visual hierarchy: score banner → reveal button → patterns.
- For each user-confirmed concern, render one score per candidate. Multiple scores stack as small cards inside the alignment banner.
- Drill-down: tap a score → expand a panel listing the contributing votes (bill title, vote cast, date, source chip).
- For challengers with prior political experience, score is computed from the prior-role's voting record (per Packet 1's rule).
- For first-time challengers with no voting record at all: alignment slot renders "No voting record yet" — same shape as patterns' challenger-empty state.
- For races where the model can't assemble a vote record (e.g., a race where Vote Smart has no Key Votes for that office): alignment slot renders "Voting record not available for this office."
- Anonymized → reveal flow: score is anchored to "Candidate A" until reveal. The factual count itself is not anonymity-defeating.
- Disclaimer copy: top of dashboard once + bottom of every drill-down once.
- Hold the no-recommendation line. The score IS the answer; no editorial gloss on top.

Assumptions:

- Confirmed concerns from Packet 2's `[VOTER CONFIRMED CONCERNS]` are the input set. Each carries a `canonicalIssue` id and a `resolvedStance`.
- The model uses `web_search` to find Vote Smart Key Votes (or roll-call records) per (candidate, canonicalIssue). Costs scale per session — acceptable for v2 launch traffic; Packet 6 moves this to a backend pipeline.
- ES path stays held back.

User-confirmed decisions:

- Score above patterns, not in place of them.
- LLM-driven for v2 launch; backend pipeline in Packet 6.
- Disclaimer top of dashboard + bottom of each drill-down.
- Hold no-labeled-guess line.
- Anonymized → reveal stays.

Edge cases:

- User skipped Act 2 → no confirmed concerns → no alignment scores rendered (graceful degrade to four-pattern-only dashboard).
- Voted unanimously with the user's side on every contributing vote (N == M, perfect alignment) → render the count plainly, no "100%" hyperbole.
- Voted against on every contributing vote (N == 0) → render plainly.
- Thin record (e.g., total < 5 votes) → render with explicit "based on N votes" label; no hidden floor.

Out of scope:

- Backend ingestion pipeline (Packet 6).
- Polis viz (Packet 5).
- Proposition routing (Packet 4 — propositions don't get alignment scores in this packet; v1 of the proposition flow stays).
- Spanish path content.

## Scope

Touch:

- `src/lib/structured-blocks.ts` — new `[ALIGNMENT_SCORES]` parser family (parse, strip, hasOpen, stripPartial). New types: `ContributingVote`, `AlignmentScore`, `AlignmentScoresEntry`, `AlignmentScoresBlock`.
- `src/lib/structured-blocks.test.ts` — tests for the new parser family.
- `src/components/AlignmentScoreBanner.tsx` _(new)_ — renders a candidate's alignment scores as compact stacked cards. Each score: issue label, "N of M" ratio, "based on N votes" label when thin, drill-down trigger.
- `src/components/AlignmentDrilldown.tsx` _(new)_ — expandable panel listing contributing votes per score. Bill title, vote cast (with/against the user's side), date, source chip. Disclaimer at the bottom.
- `src/components/AlignmentScoreBanner.test.tsx` and `src/components/AlignmentDrilldown.test.tsx` _(new)_.
- `src/components/RacePatterns.tsx` — accept an optional `alignmentScores` prop (Map keyed by candidate id) and render `AlignmentScoreBanner` at the top of each candidate section, above the existing four-pattern content.
- `src/components/RacePatterns.test.tsx` — extend tests.
- `src/components/ChatPanel.tsx` — render dispatch for `[ALIGNMENT_SCORES]` block (parsed alongside `[RACE_PATTERNS]` for the same race; merged into one dashboard render).
- `src/components/ChatPanel.test.tsx` — tests for the merged dispatch.
- `src/lib/translations.ts` — new EN keys for alignment banner + drilldown copy + disclaimers. ES bodies as EN copies.
- `docs/BALLOT_PROMPT.md` — Act 3 updated with `[ALIGNMENT_SCORES]` emit rules per (candidate, canonicalIssue), block schema, "factual count" framing, anti-recommendation reminder. Add disclaimer instruction. Run `npm run sync:ballot-prompt`.
- `src/lib/generatePrompt.test.ts` — assertions for the new prompt content.

Do not touch:

- ES content.
- Budget code, state fixtures.
- `[RACE_PATTERNS]` block schema (alignment scores are a sibling block, not a field on RACE_PATTERNS).
- Polis viz, backend pipeline, proposition flow.

## Acceptance Criteria

- New `[ALIGNMENT_SCORES race="..."]` parser family exists with the four-function quartet.
- Schema supports: per candidate, an array of per-canonical-issue scores, each with `kept`, `total`, an issue label, a `resolvedStance` (the user's side), and an array of `contributingVotes` with `billTitle`, `voteCast`, `date`, `source`.
- `AlignmentScoreBanner` renders all per-issue scores for a candidate; drill-down on tap surfaces `AlignmentDrilldown` with contributing votes + sources.
- Disclaimer renders once at the top of the `RacePatterns` dashboard (above the comparison strip) and once at the bottom of every `AlignmentDrilldown` panel.
- ChatPanel intercepts `[ALIGNMENT_SCORES]` and merges with `[RACE_PATTERNS]` for the same race into a single rendered dashboard. Two separate blocks; one combined render.
- Anonymized → reveal flow continues to work — alignment scores show under "Candidate A/B/C" until the reveal tap.
- Prompt instructs the model to emit `[ALIGNMENT_SCORES]` after `[RACE_PATTERNS]` for each race, computing scores via web_search per (candidate, canonicalIssue) using the user's `[VOTER CONFIRMED CONCERNS]` as the input set.
- For races where the model has no voting data, a single empty-state slot renders with a one-line reason.
- Lint clean, full test suite green, build succeeds.

## Anti-solutions

- An "overall alignment %" headline that aggregates across issues — the score is per-issue, not an aggregate.
- Editorial "best match" or "recommended" language anywhere.
- Replacing the four-pattern dashboard.
- Storing alignment data inside `[RACE_PATTERNS]` schema.
- Disclaimer on every candidate card (loud and noisy; the policy is "once at top + once per drill-down").
- Anonymity defeat: rendering candidate names early.
- Coupling to Packet 6's backend pipeline (this packet is LLM-driven only).

## Notes

Three-phase subagent execution. Phase 1 has two parallel agents (parser + components). Phase 2 wires ChatPanel + prompt. Phase 3 verifier audits.
