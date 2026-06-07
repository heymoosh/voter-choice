# Overnight Auto-Run Plan — Alignment Pole Vocabulary (FROZEN)

**This file is the single source of truth for the unattended run. Each loop
iteration: (1) re-read this file, (2) do the next unchecked item in order,
(3) commit, (4) check the box here, (5) schedule the next wakeup. When every
box is checked OR context degrades, STOP (omit the wakeup). Do NOT add items
to this checklist.**

---

## Why this exists

Muxin asked for a safe overnight run that moves the alignment work forward so it
**ports cleanly into the in-progress 2026 front-end redesign** when that lands.
The enabling insight (confirmed this session): the correctness fix is
**interface-preserving** — it changes the *meaning* of `stance_lens` /
`resolvedStance` and the tagger/resolver, NOT any interface or UI. So the entire
substrate can be built without touching one file the redesign owns. It sits
*under* the already-shipped surfaces (AlignmentScoreBanner, AlignmentDrilldown,
the `[CONCERN_INTERPRETATION]` disambiguation gate, the donor tool), which stay
exactly as they are.

## Provenance (author against these — do not drift)

- **Branch:** `alignment/pole-vocabulary`, in worktree
  `.claude/worktrees/alignment-pole-vocab`, based off `launch/production` @ `db3b63d`.
- **Canonical issue set (16):** keyed to the **redesign** branch
  `feat/design-integration` @ `782a0f8` (`src/lib/canonicalIssues.ts`):
  healthcare_affordability, border_security, economy_jobs, education_funding,
  public_safety, crime_public_safety, property_taxes, water_infrastructure,
  energy_grid, reproductive_rights, gun_rights_safety, environment_climate,
  election_integrity, immigration, housing_affordability,
  **congressional_accountability** (the +1 the redesign added vs production).
- **Tagger directionality convention** (`scripts/ingest/_classify-batch.ts` L53-55) —
  the binary the poles MUST map onto:
  - `stance_lens` = *what voting **YEA** on the bill MEANS for the issue.*
  - `in_favor` = a YEA **supports / expands / funds** the issue.
  - `opposed` = a YEA **restricts / cuts / opposes** the issue.
  - The poleless ambiguity this kills: "expand `gun_rights_safety`" is undefined
    (rights? safety?). The vocabulary's job is to **define** what `in_favor`
    vs `opposed` concretely denote for each issue, so tagger and resolver can't
    drift. **Exactly two poles per issue, each mapping onto in_favor/opposed.**
    A 3-pole axis silently will not port — do not create one.

## Envelope

**MAY** (all safe, isolated, no collision):
- Author / edit DESIGN + SPEC + new DATA-as-prose artifacts in this worktree only.
- Edit *our own* alignment docs (ALIGNMENT_DATA_MODEL.md, etc.) on this branch.
- Read anything anywhere in the repo (read-only) to author accurately.
- Spawn subagents that reason **offline** (from definitions + hand-authored
  example votes) — never fetching real votes, never hitting the DB or web.
- `git commit` to `alignment/pole-vocabulary` in this worktree.

**MUST NOT:**
- Edit `src/lib/canonicalIssues.ts`, `scripts/ingest/*` (the tagger), the
  stance-resolver, `docs/BALLOT_PROMPT.md` / generated prompt modules, or
  `db/schema.ts`.
- Touch any **other** worktree — especially `design-integration` (active
  redesign, read-only) and `launch-production-federal`.
- Read or write the **production database**; run the tagger; run migrations;
  deploy; or web-fetch "real votes." Critics reason offline.
- Write live `src/` TypeScript (artifacts are docs/data prose only — an
  unimported `.ts` invites build/lint noise and reads as "already wired in").
- Push, force-push, delete branches, rewrite history, or add npm deps.
- Add items to this checklist or invent polish once it's exhausted.

## Kill switch

All work is local commits on `alignment/pole-vocabulary` — **nothing is pushed
or deployed.** To stop: interrupt the session / tell me "stop the loop," or just
let it finish (it stops itself when the checklist is done). To discard entirely:
`git worktree remove .claude/worktrees/alignment-pole-vocab` and delete the
branch. To adopt: review, then merge/cherry-pick toward the redesign deliberately.

---

## Checklist (ordered — do in this order; vocabulary FIRST so the keystone is durable)

### Tier 0 — durability
- [x] Consolidate the four untracked alignment docs onto this branch (commit `99e96e0`).
- [x] Write this frozen plan.

### Tier 1 — THE deliverable: the pole vocabulary (keystone)
- [x] **T1.1** `docs/alignment/POLE_VOCABULARY.md`: convention header + the entry
  template + 4 worked exemplar axes (gun_rights_safety contested; healthcare
  valence; housing means-trap; immigration contested). Commit `<T1.1>`.
- [x] **T1.2** All **16** issues authored (9 contested w/ disambiguation
  questions, 7 valence-dominant). Each: axis_type, two poles
  (name/means/bill_signals → in_favor/opposed), example_concerns, contested
  questions. Commit `<T1.2>`.
- [x] **T1.3** Adversarial critic acceptance pass — **DONE (clean).**
  - [x] Ran 3 offline critics; verdict + full MUST-FIX list recorded in
    `POLE_VOCABULARY.md` `## Critic verdict`. Applied this session: 3
    reclassifications (economy_jobs / education_funding / property_taxes →
    contested) + election_integrity orientation lock + reproductive_rights
    scope-match. **Verified from `alignment.ts`:** `issue_tags` is keyed by
    `(billId, canonicalIssue)`, so `stance_lens` IS stored per-(bill,issue) pair
    → the cross-issue shared-signal concern is correct-by-construction, NOT a
    blocker (downgrade that convention note).
  - [x] **Loop: applied ALL recorded must-fixes** (energy_grid + public_safety
    subject redefs + means-traps; environment overlap rulings + debiased question;
    reproductive_rights scope-match; election_integrity orientation lock; housing
    tiebreak; cross-issue routing notes; minors; convention-level rules). Commit
    `e78dfa2`. Re-verification critic returned **CLEAN — all 8 blockers closed**; 2
    new minors (reproductive question scope; healthcare tiebreak over-breadth) fixed
    in the follow-up commit.

### Tier 2 — conditional (only once Tier 1 is complete AND critic-clean)
- [x] **T2.1** Reconciled `docs/ALIGNMENT_DATA_MODEL.md` to the v2 brief: renamed
  "bridge" → "vote rationale" throughout (collision with Polis "bridge statements";
  mapped to the shipped `AlignmentDrilldown` line item); added the correctness-layer
  framing block (brief is canonical product spec & read-only; its "canonicalIssue +
  binary stance" assumption is insufficient on contested axes; interface-preserving
  fix); aligned vocab (`resolvedStance` ≡ pole; `[CONCERN_INTERPRETATION]` ≡ §6.2);
  pointed §5 + §9 at POLE_VOCABULARY.md and the critic-surfaced decisions. Edited
  only our docs.
- [x] **T2.2** Shared-anchor + trigger spec written (`docs/alignment/SHARED_ANCHOR_SPEC.md`):
  single source of truth (POLE_VOCABULARY.md) → structured derivative → consumed by
  BOTH the tagger and the resolver; data-driven trigger (axis_type=contested ⇒ always
  ask, not the LLM's confidence guess); drift guards (one file/two readers, version
  stamp, offline round-trip test); all downstream changes flagged redesign-coordinated,
  none edited. Interface-preserving.
- [x] **T2.3** Contested-axis re-tag plan written (`docs/alignment/RETAG_PLAN.md`) —
  design-only, execution explicitly gated (approval + DB + redesign-coordinated
  prompt change). Scope (12 contested issues, all rows; election/repro/energy/public
  fixes; public↔crime double-tags), method (new tag version, reversible, fall-through
  rules), **offline labeled-gold-sample validation** with an inversion-rate bar (no
  prod read), per-issue cutover sequencing.

### Tier 3 — conditional (only once Tier 2 is complete)
- [x] **T3.1** Fundraising → pole mapping framework written
  (`docs/alignment/FUNDRAISING_POLE_MAP.md`): standalone parallel signal reusing the
  pole vocabulary; source data (donor_aggregates sectors + CAN trails/issue-PACs +
  negative assertions); two-tier mapping model + seed table (sectors + named PACs to
  existing canonical poles); the **new-axis gap** (Fairshake/crypto, AIPAC/Israel
  aren't canonical issues → show standalone, flag for HANDOFF); claims/don't +
  challenger value. Binds to POLE_VOCABULARY.md; build-at-scale gated.
- [x] **T3.2** Portability map written (`docs/alignment/PORTABILITY_MAP.md`): each
  artifact → the shipped surface it feeds; the untouched-vs-changed summary
  (enum/tools/components untouched; only tag content + prompts + a rationale field
  change); key-compatibility confirmed against the 16 issues @ `782a0f8` (only the
  gated split/rename/new-axis decisions would churn keys); port order.

---

## Morning hand-off — ✅ DONE

**RUN COMPLETE.** All Tier 0–3 items finished and committed; `docs/alignment/HANDOFF.md`
written (leads with the 6 decisions for Muxin). The self-paced loop stops itself here.
Nothing pushed/deployed; nothing executed; no shared/redesign files touched.

`docs/alignment/HANDOFF.md` — **lead with the decisions only Muxin can make**
(this preserves the review-together posture held all session), THEN a short
index of what was produced. Decisions to surface, at minimum:
- Disambiguation-question **phrasing** for each contested axis (editorial / voice).
- **Axis granularity** (e.g. one `housing_affordability` vs splitting a
  `housing_cost` axis) — the one choice that *would* ripple into shared files.
- Any issue the critic could not make unambiguous.
Do **not** open with a doc dump.
