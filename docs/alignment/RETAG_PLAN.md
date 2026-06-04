# Contested-Axis Re-Tag Plan (DESIGN ONLY — execution gated)

**Status:** Design / spec. **Nothing is executed by this plan.** Running it requires
three things this branch does NOT do: (1) Muxin's approval, (2) production DB
read/write access, and (3) the pole-anchored tagger prompt change, which lives in
the tagger (`scripts/ingest/_classify-batch.ts`) + the shared derivative
(`SHARED_ANCHOR_SPEC.md`) and must be coordinated with the `design-integration`
redesign. This doc is the *what and how* so that, once approved, execution is
mechanical and safe.

## Why a re-tag is needed (recap)

The `BILL_TAG_AUDIT` measured ~25–30% tag error overall and **~40–55% on the poleless
contested issues** — high-confidence rows included (confidence is anti-calibrated, so
"only re-tag low-confidence" is unsafe). The live `lookupAlignment` reads these tags,
so the inversion reaches the shipped score. The re-tag re-derives `stance_lens`
against the now-defined poles (`POLE_VOCABULARY.md`), consumed identically by tagger
and resolver (`SHARED_ANCHOR_SPEC.md`).

## Scope (what gets re-tagged)

**Launch-blocking — the 12 contested issues** (each now has defined poles + an
orientation lock where needed):
gun_rights_safety, immigration, border_security, public_safety, crime_public_safety,
energy_grid, reproductive_rights, environment_climate, election_integrity,
economy_jobs, education_funding, property_taxes.

Within scope, re-tag **every** `issue_tags` row for these issues (not just
low-confidence). Specific sub-tasks the audit + critic flagged:
- **election_integrity** — apply the orientation lock (access = `in_favor`; a
  restrictive "Election Integrity Act" = `opposed` regardless of title).
- **reproductive_rights** — Pole B now spans contraception/IVF/Title-X, not just
  abortion; re-tag so those restrictions land `opposed`.
- **energy_grid / public_safety** — the redefined Pole A subjects (fossil/conventional
  production; policing capacity) mean "funds clean energy / funds prevention" must tag
  `opposed`, not `in_favor`.
- **public_safety ↔ crime_public_safety** — split the ~585 double-tags along the
  policing-vs-sentencing boundary; stop cross-tagging the same provision.

**Not launch-blocking — valence-dominant spot-fixes** (healthcare, housing, water,
congressional_accountability): mostly fine; apply the means-trap tiebreaks
(healthcare tax-cut mechanism; housing funding-cut-dominates) and the
congressional_accountability scope guard (exclude term-limits / partisan oversight).

## Method

1. Build the **structured derivative** of `POLE_VOCABULARY.md` (per
   `SHARED_ANCHOR_SPEC.md` §5) and the pole-anchored tagger prompt.
2. Re-run the tagger (title + ≤4000-char summary, as today) over in-scope bills,
   asking the **pole question** ("does a Yea advance Pole A or Pole B?") and obeying
   the cross-cutting rules: **fall-through = no-score**, omnibus → dominant provision
   else no-score, per-`(bill, issue)` storage.
3. Write results to a **new tag version** (do NOT overwrite in place) — keep the old
   `stance_lens` alongside a `tagger_version` so the re-tag is fully reversible and
   the before/after delta is auditable. Cut over `lookupAlignment` to the new version
   only after validation passes.

## Validation — offline, no prod read

The gate before any cutover. Built from a **labeled gold sample**, not a production
query:

1. **Gold sample.** For each contested issue, assemble ~40–60 bills spanning both
   poles + near-misses (omnibus, procedural, cross-issue). Label each by hand (or by a
   high-effort multi-model panel) **against the pole definitions** — this is the
   ground truth. Created at execution time; offline.
2. **Score the candidate tagger** on the gold sample: precision/recall per pole, and
   the **inversion rate** (the metric that matters — fraction tagged the *opposite*
   sign). Compare against the old tagger on the same sample to confirm the new one
   actually reduces inversion.
3. **Bar to cut over:** inversion rate on the gold sample below an agreed threshold
   (propose ≤5% per contested issue; Muxin sets the number) AND a strict improvement
   over the old tagger. Issues that miss the bar stay on the old tags with a
   "needs-work" flag rather than shipping a worse-but-different error.
4. **Spot-audit** a fresh random slice of the full re-tag output (not in the gold
   sample) before cutover, to catch sample-overfit.

All validation is offline (labeled fixtures + the candidate prompt) — **no production
DB read, no web vote-fetch.**

## Sequencing

1. Land `POLE_VOCABULARY.md` + the structured derivative + the pole-anchored prompt
   (redesign-coordinated).
2. Build gold samples for the **highest-inversion issues first** (audit-ranked —
   election_integrity, gun_rights_safety, immigration, crime/public_safety lead).
3. Dry-run the candidate tagger on the gold samples; measure; iterate the prompt until
   the bar is met.
4. Re-tag contested issues in priority order, each to a new tag version, validate,
   cut over per-issue (per-issue cutover limits blast radius).
5. Valence spot-fixes after the contested set is clean.
6. Re-run the `BILL_TAG_AUDIT` against the new tags to confirm the corpus-level error
   dropped.

## Explicitly out of scope / still gated

- Any actual tagger run or DB write (needs approval + access).
- The tagger prompt edit and the structured-derivative module (redesign-coordinated;
  not edited in this branch).
- Full-text bill reading — unchanged; tagger still uses title + summary, and vote
  *meaning* still comes from curated context (CAN) where it exists, never a
  cleanliness heuristic.
- Axis **splitting** (e.g. `housing_cost`) — depends on the granularity decision
  (HANDOFF); the re-tag above keys to the existing 16 canonical issues.
