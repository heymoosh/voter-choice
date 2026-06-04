# Alignment Substrate — Morning Hand-off

The overnight run finished the whole checklist. Everything below is **design + data
prose on an isolated branch** (`alignment/pole-vocabulary`) — nothing executed,
nothing pushed, no production DB touched, no shared/redesign files edited. It's built
to **port cleanly under the surfaces the redesign already shipped** (the score banner,
the drill-down, the `[CONCERN_INTERPRETATION]` gate, the donor tool) — interface-
preserving: the `in_favor`/`opposed` enum, tool signatures, and components don't change.

---

## ⬛ Decisions only you can make (let's review these together)

These are the product/editorial calls I deliberately did **not** make for you. Each
has my recommendation so you can mostly just confirm.

1. **Disambiguation-question phrasing (12 contested issues).** Each contested issue
   has a drafted neutral, no-labeled-guess question + two button labels in
   `POLE_VOCABULARY.md`. These are *voice/editorial* — please skim the tone,
   especially the sensitive ones: **reproductive_rights** ("protecting access to
   abortion and contraception, or restricting it"), **election_integrity**,
   **guns**, **immigration**. *Rec: adopt as drafted; tweak wording to your voice.*

2. **Axis granularity — split `housing_affordability`?** Rent control vs build-more
   are *opposing means* that both claim "lower rent," living inside one pole. Keep it
   valence + show the rationale (current), or split a finer `housing_cost` contested
   axis? *Rec: keep valence for launch; revisit post-launch.* ⚠ Splitting **adds a
   key to `canonicalIssues.ts`** + the prompt vocabulary.

3. **Merge `public_safety` and `crime_public_safety`?** The critics found them
   near-duplicate (policing/use-of-force vs sentencing/incarceration). I kept them
   separate with a sharp boundary + no-cross-tagging rule. *Rec: keep separate with
   the boundary; merge only if the two feel redundant to users.*

4. **Rename `election_integrity` → `voting_access`?** The label fights its own
   orientation (a real inversion trap) — I added an orientation lock so it's safe
   as-is, but the rename removes the trap permanently. *Rec: rename when convenient.*
   ⚠ **Changes a key in `canonicalIssues.ts`** + the prompt.

5. **New funder axes — adopt or keep standalone?** The most *telling* funders
   (Fairshake/crypto, AIPAC/Israel) push agendas that aren't among the 16 canonical
   issues. *Rec: keep them **standalone** (show sector + amount + citation, no pole
   match) for launch; add canonical axes later only if worth the tagging cost.*

6. **Two thresholds.** Re-tag cutover bar — I propose **inversion rate ≤5%** per
   contested issue on an offline gold sample before cutover. Abstain threshold — extend
   the existing `LIMITED_DATA_THRESHOLD = 5`. *Both are your numbers to set.*

> **Heads-up that reframes the product:** the critic pass reclassified
> **economy_jobs, education_funding, property_taxes** from valence → contested
> (already applied). So **12 of 16 issues are now contested**, which makes the
> disambiguation gate the *central* UX, not an edge case — and is why the
> data-driven trigger (contested ⇒ always ask) matters.

---

## What got built (index)

All under `docs/alignment/` unless noted. Branch `alignment/pole-vocabulary`,
12 commits, off `launch/production @ db3b63d`, keyed to `design-integration @ 782a0f8`.

- **`POLE_VOCABULARY.md`** — *the keystone.* All 16 canonical issues, each with two
  defined poles bound to `in_favor`/`opposed` + bill signals + example concerns +
  (contested) a disambiguation question. **Adversarially critic-validated: all 8
  blockers closed, verdict CLEAN.**
- **`SHARED_ANCHOR_SPEC.md`** — how the tagger *and* the resolver consume the one
  vocabulary so they can't drift (the root cause of inversion); the data-driven
  disambiguation trigger; drift guards.
- **`RETAG_PLAN.md`** — design-only, **execution gated**: re-tag the contested-issue
  corpus to a new reversible version, validated offline (labeled gold sample, no prod
  read), per-issue cutover.
- **`FUNDRAISING_POLE_MAP.md`** — fundraising as a standalone parallel signal reusing
  the poles; seed sector + PAC table; the new-axis gap (#5 above).
- **`PORTABILITY_MAP.md`** — artifact → shipped-surface mapping; proof of clean port;
  key-compatibility check.
- **`ALIGNMENT_DATA_MODEL.md`** — reconciled to the v2 brief; "bridge" renamed to
  **"vote rationale"** (the old name collided with the redesign's Polis "bridge
  statements"); now framed as the correctness layer beneath the brief.
- **`OVERNIGHT_PLAN.md`** — the frozen plan + run log (every checkbox + commit).
- Also **consolidated + made durable** (were uncommitted scratch, at risk of loss):
  `ISSUE_DIRECTIONALITY_DESIGN.md`, `CAN2026_ENRICHMENT_SCHEMA.md`,
  `operations/BILL_TAG_AUDIT.md`.

## What is NOT done (gated — needs you)

Nothing was executed. Before any of this reaches users it needs your go-ahead and
coordination with the redesign:
- The **re-tag run** (needs approval + DB access + the tagger prompt change).
- The **tagger + resolver prompt changes** and the structured vocabulary derivative
  (these live in `design-integration` — coordinate, don't fork).
- Decisions #2/#4/#5 if "yes" → the only changes that touch `canonicalIssues.ts` /
  the prompt vocabulary.

## How to use this branch

- **Review:** read `POLE_VOCABULARY.md` first (the keystone), then this file.
- **Adopt:** merge / cherry-pick toward the redesign deliberately — it's keyed to
  `design-integration@782a0f8`.
- **Discard:** `git worktree remove .claude/worktrees/alignment-pole-vocab` + delete
  the branch. Nothing was pushed or deployed.
