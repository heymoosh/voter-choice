# Alignment Eval — how we measure (and locate) accuracy

**Status:** the measurement system for the alignment scoring engine. It lives on
`launch/production` so every worktree and future session inherits it. Companion:
`ALIGNMENT_LEDGER.md` (the running log of runs + findings).

> The alignment *design* (the issue "sides" / pole vocabulary, the re-tag plan, etc.)
> currently lives on the `alignment/pole-vocabulary` branch. Consolidating those onto
> the trunk alongside this is the recommended next housekeeping step.

## The one metric that matters
On a labeled set of (bill, issue) pairs: **% scored correctly**, and of the errors,
**how many are *inversions* (the score points the wrong way — the dangerous kind) vs.
honest *abstains* ("can't tell").** An inversion is just the off-diagonal of a
2-class (`in_favor`/`opposed`) confusion matrix. That's the headline; everything else
is diagnostic.

Also tracked:
- **Inter-rater agreement** — run N independent taggers; how often do they agree
  (especially on *direction*)? This is the reliability check against LLM run-to-run
  variation. (LLMs are probabilistic; we measure agreement, we don't expect
  determinism.)
- **Coverage / abstain rate** — % scored vs. abstained. More correctness often costs
  coverage; this is the tradeoff knob (ties to the abstain threshold).

**Not tracked (overkill — we evaluate a product pipeline, not train a model):** model
loss/perplexity, model-vs-model leaderboards (MMLU etc.), any fine-tuning metric.

## Locating *which step* is failing
The pipeline is staged, so failures can be attributed instead of guessed:
1. concern → (issue, side)  — runtime resolver
2. bill → (issue, side)  — the tagger  ← most errors live here
3. with/against comparison (XNOR)  — deterministic, rarely the culprit
4. tendency aggregate (kept/total)  — deterministic

Run each stage against its own labeled set; the first stage whose output diverges from
the label is the culprit. The per-vote rationale (the "show your work" chain) makes
individual cases inspectable.

## How a run works (the procedure used 2026-06-04)
1. Pull a stratified real sample (**read-only**) from the `alignment-work` Neon branch
   — never production.
2. N independent taggers (blind to the current tag) assign the side from real
   `title` + `summary`.
3. Consensus = majority; agreement = reliability.
4. Compare consensus to the current production tag; classify each: same /
   inversion-fixed / →no-score.
5. Spot-check the flips against the bill facts; record findings in the ledger.

## Settings captured every run (non-negotiable)
model id · effort/reasoning level · sampling settings · prompt version · vocabulary
version (commit) · date · sample definition. A "fix" only counts if it reproduces
under recorded settings.

## Honest limits (so the green lights mean something)
- **Shared-orientation circularity:** taggers + grading use the same fixed "sides," so
  a run proves *inversion-fixing + consistency*, **not** that the sides match product
  intent — that's an editorial call (the "fights reality" flag is the partial check).
- One sample, one model family per run — agreement mitigates, doesn't eliminate.
- Real end-to-end accuracy needs the live corpus (the branch) and, eventually, a
  small human-confirmed gold set as the anchor.

## How future sessions use this (the discipline)
**Any change to alignment scoring — the pole vocabulary, the tagger prompt, or the
concern-resolver — MUST run an eval on the `alignment-work` branch and append the
result + findings to `ALIGNMENT_LEDGER.md` before merge.** Don't re-learn what the
ledger already records; read it first.
