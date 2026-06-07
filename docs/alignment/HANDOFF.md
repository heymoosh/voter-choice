# Alignment Re-Tag — Handoff (current state, 2026-06-05)

**Read `docs/alignment/ALIGNMENT_LEDGER.md` first** — it is the run-by-run source of truth.
This file is the synthesis: where things stand, what's left, and how to continue. *(Supersedes
the earlier "morning hand-off"; that content is in git history + the ledger.)*

## Context

The alignment feature ("did this candidate vote with your side?") was **silently inverting**
on contested issues — the bill-tagger labeled poleless topics (guns, crime, immigration…) with
an undefined `in_favor`/`opposed`, producing ~40–55% wrong tags (`docs/operations/BILL_TAG_AUDIT.md`).
We designed an **(axis, pole)** fix, built an **eval + learnings-ledger** discipline around it,
and re-tagged the contested-issue corpus on an isolated Neon branch — corrected tags written to
a **separate table so production never changes** until a deliberate, gated cutover.

## DONE (durable)

- **Committed on `launch/production`:** the design (`docs/ALIGNMENT_DATA_MODEL.md`,
  `ISSUE_DIRECTIONALITY_DESIGN.md`, `CAN2026_ENRICHMENT_SCHEMA.md`, `operations/BILL_TAG_AUDIT.md`,
  `docs/alignment/POLE_VOCABULARY.md` = the keystone, + `SHARED_ANCHOR_SPEC.md`, `RETAG_PLAN.md`,
  `FUNDRAISING_POLE_MAP.md`, `PORTABILITY_MAP.md`); the **eval** (`ALIGNMENT_EVAL.md`) + **ledger**
  (`ALIGNMENT_LEDGER.md`, findings F1–F8 / M1–M2); the **AGENTS.md "Alignment Scoring" rule**
  (every pole/tagger/resolver change runs the eval + appends to the ledger before merge); a
  Data-Quality backlog item for missing summaries.
- **On the Neon branch `alignment-work` (NOT production):** corrected tags in **`issue_tags_pole_v1`**
  (`pole_stance` ∈ in_favor | opposed | no_score; old `issue_tags` untouched; reversible via
  `DROP TABLE`). **All 8 launch-blocking contested issues done** — gun (692), immigration (407),
  border (155), reproductive (619), public_safety (5499), crime (3800), environment (2941),
  election (1774) = **15,887 tags**. Connection: `.env.alignment` in this worktree (gitignored;
  never use `.env.local`/production for this work).
- **Headline:** **~60% of contested tags are now `no_score`** — corrected but far thinner (traded
  confidently-wrong coverage for correct coverage). Drivers: over-tag cleanup (border/public_safety/
  election were grab-bags, F8), missing summaries (~47% of state bills), genuine ambiguity.

## LEFT (finish what we started)

1. ~~**Re-tag** `economy_jobs`/`education_funding`/`property_taxes`~~ **+ `energy_grid` — ✅ DONE
   2026-06-05** (`source_run='big-2'`, **15,593 tags**, Sonnet via 1 background Workflow; 1:1 coverage
   verified). `energy_grid` was the **un-re-tagged 12th contested issue** (RETAG_PLAN lists 12; the
   prior handoff accounted for 11) — surfaced in the Step-0 audit, **32% inversions** (means-trap:
   clean-energy funding read as pro-production). **All 12 launch-blocking contested issues are now
   corrected in `issue_tags_pole_v1` (31,480 tags total).** See the ledger's `big-2` entry.
2. **Cutover (gated)** — **✅ DONE 2026-06-06. Corrected tags are LIVE in production** (`issue_tags`
   42,506 → 24,866; backup `issue_tags_backup_precutover`; see the ledger's "🔥 CUTOVER FIRED"
   entry). Follow-ups: stricter public_safety re-tag, the parked granularity/vocab code changes,
   null-summary recovery, optional read-path `no_score` guard. Original approach below for record. —
   **VALIDATED 2026-06-06; staged, awaiting prod URL to fire.** Approach
   chosen: **data-only migrate-with-deletes** into production `issue_tags` under existing keys
   (upsert confident; DELETE `no_score` so the innerJoin excludes them like abstains) — **no
   app-code change** (confirmed against the deployed `lookupAlignment`, innerJoin on
   `issue_tags.canonical_issue`, no `stance_lens` filter). Offline gold-sample gate (independent
   3-juror Opus panel): **all 12 issues PASS ≤5% inversion** (11 at 0%, education 0/28 after a
   1-tag fix) vs old tagger 13–53% inverted; SQL mechanics rehearsed on a clone. Plan +
   tooling: `scripts/ingest/_cutover-{plan.json,fire,verify,rehearse}.ts`. **All 12 migrate, none
   blank.** **To fire, need from Muxin:** production `DATABASE_URL` + a throwaway Neon branch off
   prod for the literal-script rehearsal. See the ledger's 2026-06-06 entry.
3. ~~**Missing-summary recovery**~~ — **✅ DONE 2026-06-05** (`source_run='summary-recovery-1'`).
   Recovered full text for **9,408/16,841 (56%)** null-summary tagged bills from Muxin's **local
   OpenStates pgdump** (`searchablebill.raw_text` — no API/PDF/OCR); wrote 9,405 `bills.summary` +
   re-tagged 7,828 contested pairs → **1,598 recovered no_score→confident, 93 inversions fixed, 516
   false-confident removed**. Residual ~6,868 are `is_error` in OpenStates' own extraction (scanned
   PDFs). See the ledger's `summary-recovery-1` entry.
4. **CAN2026 ingest** — still NOT done (design-only). Optional federal enrichment.
5. **Apply parked granularity at cutover** (touches `canonicalIssues.ts` + prompt — redesign-coordinated):
   border→immigration merge (F7); public_safety+crime→one `criminal_justice` axis (already tagged with
   merged poles under existing keys); election_integrity→`voting_access` rename; housing split.

## How to continue (proven pattern — Claude subscription, $0 API)

1. **Read-only first** via `.env.alignment`: confirm `issue_tags_pole_v1` counts; confirm `issue_tags`
   unchanged (42,506).
2. **Stage → tag → insert → verify:** pull an issue's bills not yet in `issue_tags_pole_v1` into
   ~100-bill batch files; tag with **subagents** (small) or a **background `Workflow`** (big) using
   that issue's poles; agents write a results JSON per batch; insert via chunked `unnest` +
   `ON CONFLICT DO UPDATE` (idempotent); verify the old→new transition matrix. **Subagents are on the
   subscription — do NOT use an API key (the user was explicit).**
3. **M2 — verify-and-retry is mandatory:** the big workflow reported all batches "completed" but **25%
   never wrote a result file.** Check each result file exists + is valid and re-run missing batches
   before trusting coverage.
4. **Ledger discipline:** append every run + finding to `ALIGNMENT_LEDGER.md` and commit (capture
   model/settings — M1).

## Missing-summary recovery (refined)

The ingest **already** requests OpenStates `abstracts` and falls back to `subject`
(`scripts/ingest/state-votes.ts`: `fetchOpenStatesJson` ~L475; `buildBillRow` ~L741–783). So the
47% nulls mean OpenStates has **neither an abstract nor a subject** for those bills — re-ingesting
won't help. Real options: (a) fetch each bill's **full text** (OpenStates versions/sources) and
LLM-summarize, or (b) accept title-only + abstain. See the Data-Quality backlog item.

## Open decisions for the user

- **Coverage:** ship thinner-but-correct now, or recover summaries first? (Rec: ship correctness;
  make summary recovery the top coverage follow-up — the one lever that adds coverage without
  reintroducing wrong answers.)
- **When to cut over** to the corrected tags.

## Verify (read-only)

- `SELECT canonical_issue, pole_stance, count(*) FROM issue_tags_pole_v1 GROUP BY 1,2` on the branch
  (expect the 8 issues above); `SELECT count(*) FROM issue_tags` = 42,506 (unchanged).
- `git log --oneline` on `launch/production` shows the alignment doc + ledger commits.
