# Handoff: adversarial review of the codebase against the donor-framing & accountability plan

**Written 2026-08-16.** You are an adversarial reviewer. Your job is to verify
that this codebase actually does what the plan says it does — treating every
"executed", "RUN", "COMPLETE" and "LIVE" record in the plan as a **claim to
attack**, not a fact. The plan's records were written by the same
agent-assisted process that wrote the code, so agreement between doc and code
is the thing under test, not evidence.

## The plan

- **Primary document: `docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md`**
  (~2,000 lines). Section map (headings are stable; line numbers drift):
  - Part 1 — donor bucket copy
  - Part 2 — "No FEC data" diagnostic and fix (+ executed record)
  - Part 3 — committee assignments (+ executed record)
  - Part 4 — collaborator network / cosponsorship (+ executed records, audit)
  - Part 5 — promise ledger + kept/broken scoring (multiple RUN records:
    sourcing spike, pipeline run, vocabulary v2, 118th tagging, retrospective
    blockers cleared)
  - Part 6 — industry/company backing (6a PAC sponsors, 6b independent
    expenditures, curation, curated attribution; flipped LIVE 2026-08-16)
  - Data hygiene, Attribution, Verification, Open risks, Review log
- Companion documents the plan defers to:
  - `docs/PROMISE_ADJUDICATION_RUBRIC.md` (verdict rubric + version string)
  - `docs/alignment/POLE_VOCABULARY.md`, `docs/alignment/SUB_ISSUE_VOCABULARY.md`
    (prose mirrors of the code vocabularies; drift tests exist)
  - `docs/operations/launch-flip-list.md` (flag inventory; hand-synced with
    `src/lib/launch-flags.ts` — the sync itself is a claim to check)

## Repo conventions — know these or you will file false findings

1. **Migrations are raw SQL applied by hand.** There is NO drizzle journal;
   `npm run db:migrate` is a no-op by design. Migration files under
   `db/migrations/` state they are "NOT applied by this file". Do not flag
   the missing journal; DO check migration SQL ↔ `db/schema.ts` agreement.
2. **`scripts/ingest/_*.ts` (underscore prefix) are one-off operational
   scripts** — held to a lower bar (complexity warnings accepted), but their
   safety rails (dry-run defaults, `--confirm`, hardcoded-id prunes,
   validation) are part of the plan's contracts and ARE in scope.
3. **You have no database access.** Claims about row counts and prod state
   are unverifiable here — verify the code, tests, and invariants instead,
   and say so rather than assuming.
4. **Gitignored on purpose:** PolitiFact-derived calibration/gold data
   (Poynter copyright — must never be committed or republished) and
   `.env*`. Verify the gitignore actually covers what the plan promises.
5. **CI gates:** `security-reviewed` label required for `db/**`,
   `src/app/api/**`, `*secret*/*auth*/*token*/*session*` paths; a duplication
   ratchet (`scripts/quality/duplication-gate.ts`); a mutation-testing
   workflow (`.github/workflows/mutation.yml`).

## The load-bearing invariants — attack these hardest

These are the rules whose violation would be a real-world misstatement on a
voter-facing product. For each: find the enforcing code AND tests, then try
to construct a path around them.

1. **Independent expenditures never enter funding-mix math.** No funding-mix
   producer or read path may reference the IE table; support/oppose are two
   figures never summed, netted, or added to `totalRaised`.
   Enforcement: `scripts/ingest/independent-expenditure-isolation.test.ts`
   (structural source scan + allowlist), `src/lib/server/outside-spending.ts`
   (shape has no combined field), `src/prototype/redesign/OutsideSpending.tsx`.
   Adversarial angles: does the source-scan actually cover all roots? Can an
   allowlisted file leak a sum? Does `/api/delegation` (the attach point,
   `src/app/api/delegation/route.ts`) keep the isolation story?
2. **6a is a breakdown, never a new total.** `src/lib/server/pac-sponsors.ts`
   returns no aggregate; tests assert the absence. Check nothing re-adds it.
3. **Hand-curation contract** (`pac_committees.status`): re-runs may only
   reclassify `auto`; `verified`/`rejected` are human and must never be
   clobbered by any ingest (`scripts/ingest/federal-issue-pacs.ts` /
   `federal-independent-expenditures.ts` / any upsert path). A `rejected`
   row's FILED sponsor/sector never renders; in 6a a rejected row appears
   only when it carries a curated summary; in 6b rejected rows KEEP their
   spending (dropping them would understate).
4. **Curated attribution** (migration 0024): `curated_summary` +
   `curated_source_url` are written ONLY by
   `scripts/ingest/_apply-pac-curation.ts`, which refuses a summary without
   a citation. Adversarial angle: the DB has no constraint — is there any
   other write path? Does the committee-master upsert overwrite these
   columns on re-ingest? The curated line renders under any status —
   verify the read paths (`curated-attribution.ts`, both read layers, both
   components) and the committed verdict data
   (`scripts/ingest/data/pac-curation-2026-08.json` — 30 rows, every one
   must carry a sourceUrl; spot-check a few URLs for plausibility).
5. **Promise ledger stores evidence, not judgment.** `candidate_promises`
   rows must be VERBATIM quotes (anti-hallucination gate:
   `quoteAppearsInSource` in `scripts/ingest/promise-extract.ts`, validated
   against the same truncated text the model saw), with deterministic ids
   (sha-256 over candidate + archive_url + normalized text) and
   `archive_url` reproducibility. **No user-facing surface reads
   promise tables** — the plan's §6.4 gate (human κ ≥ 0.70, adjudicator
   ≥ 90%, zero polar flips) is unmet, so any `src/` read of
   `candidate_promises`/`promise_verdicts` is a finding.
6. **Cycle correctness** (added 2026-08-16 after real bugs):
   `cycleFromCorpus`, cycle-threaded page prompt, and the cycle-scoped
   resume skip in `promise-extract.ts`. The first 2022 run silently skipped
   2 shared candidates — verify the fix actually closes that class
   (NULL `made_at` handling included).
7. **Vocabulary invariants:** sub-issues inherit the parent's pole axis
   verbatim (`src/lib/alignment/subIssues.ts`); direction-orthogonal facets
   must be canonical issues; the hand-written
   `CANONICAL_ISSUES_PROMPT_BLOCK` in `src/lib/prompts/theme-extraction.ts`
   must match `src/lib/canonicalIssues.ts` (22 ids); prose docs must match
   code (drift tests); version stamps (`pole-vocab-v2`, `sub-issue-v2`,
   `promise-extract-v4+claude-sonnet-5`, `claude-sonnet-5-agent-v1`) must be
   consistent everywhere they appear.
8. **Honest-empty semantics:** `null` = "we didn't look" (flag off /
   unresolved) renders no block; empty object = "we looked, nothing on
   file" renders an explicit line. Check `/api/delegation` and both
   components preserve the distinction; check the flag reads are strict
   (`=== "true"`).
9. **Data-source policy:** Ballotpedia must not be fetched/ingested anywhere
   (licence unconfirmed); PolitiFact labels internal-only with citation,
   never republished, never committed; Integrity Index linked/credited but
   its data never pulled (`src/app/about/page.tsx`); FEC individual-
   contributor commercial-use restriction noted for any future paid tier.
10. **API-key policy:** the Anthropic key (`ANTHROPIC_VOTER_API`) is for
    user-facing chat; bulk LLM classification runs on subscription
    subagents (`_tag-bills.workflow.js`, `_vocab-delta-retag.workflow.js`).
    Known, accepted exception: `scripts/ingest/promise-extract.ts` calls the
    API directly (small, cost-logged runs). Flag any OTHER bulk API-key use.

## Claims recently recorded that deserve independent re-derivation

- "Extraction converged: 50 v4 rows + 2 deliberately-kept v2 rows; the 7
  pruned rows were all duplicates, zero vanished promises"
  (`_promise-stale-review.ts`, `_promise-prune-stale-v2.ts` — the hardcoded
  ids and their claimed duplicate-of counterparts are checkable in code).
- "The 2022 spike is a GO: 25/33 corpus-ready" and the caveat that ~80
  members lack a state column and are invisible to `--state`
  (`_promise-corpus-spike.ts`) — is that caveat handled or just logged?
- "est_cost_usd fix": `usage.input_tokens` excludes cache reads — verify
  the arithmetic now matches the Anthropic usage contract.
- The flip-list/registry claim that `PAC_TRANSPARENCY_ENABLED`'s two
  blockers were genuinely met before the 2026-08-16 flip.

## Known, accepted gaps — do NOT report these as findings

- The promise-ledger UI does not exist (explicitly deferred by Muxin; the
  "never blank" empty-state rule is recorded in the plan for later).
- The 2022 retrospective extract is incomplete (Internet Archive outage);
  link/adjudicate haven't run.
- TX-only promise corpus; seat-backfill gap (~80 members); PAC curation
  covers the top 30 by salience only.
- `capture-shared.test.ts` Playwright failures in containerized environments
  (pre-existing browser-binary issue; fails on clean main too).
- Complexity lint warnings on `_*.ts` one-off scripts and two read paths.
- "Judged, no tag" bills re-export forever (plateau semantics, documented).

## Deliverable

Ranked findings, most severe first. For each: file:line, the plan clause it
violates (quote it), a concrete failure scenario (what a voter/user would
see that is wrong or misleading), CONFIRMED (you traced the path end to
end) vs PLAUSIBLE (needs a run or DB access to prove), and a proposed fix.
Zero findings is an acceptable outcome ONLY with a list of what was checked
and how. Run the full local gate suite (`npx vitest run`, `npx tsc
--noEmit`, `npx eslint .`, `npm run dup:check`) and report any divergence
from the doc's "all green" claims.
