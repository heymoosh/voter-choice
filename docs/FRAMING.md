# FRAMING.md — How to talk about this experiment's results

**Locked in:** 2026-05-10
**Reason for committing this before any new run:** so the cohort and webinar audience don't over-index on a result that's narrower than they think, and so the framing isn't reverse-engineered to flatter whichever workflow happens to win.

---

## The claim this experiment supports

This experiment ranks 5 AI coding workflows (Vanilla Claude Code, BMAD, Compound Engineering, Spec Kit, Superpowers) on **maintainability across iterations** — measured by automated metrics across 6 staged build phases of a single Next.js civic tool — when run **autonomously, without human-in-the-loop intervention**, on the **same model class** (Claude Sonnet, enforced via `model: "sonnet"` on every sub-agent dispatch in `.claude/commands/start.md`), starting from the **same scaffold** and the **same v2.0 production spec**, with **n=3 replicates at Phase 1** (median-LOC run picked as the representative) and **n=1 forward iteration** through Phases 2–6. Phases cover progressive feature parity with the launch-production target: i18n, real APIs, multi-language w/ RTL, on-site LLM chat + alignment-score banner, drag-rank issue prioritization + concern disambiguation + Polis-style aggregate counters.

The thing the experiment is actually trying to answer is: *which workflow produces a codebase that stays maintainable as it grows through multiple iterations of changes?*

## What the claim does NOT support

The result will not, by itself, tell you:

- **Best workflow in general.** This is one project, one stack, one operator-absent setup. Don't generalize past those bounds.
- **Best workflow for skilled human operators.** The autonomous-execution constraint removes a workflow's biggest asset: a human collaborator who knows when to redirect. Workflows that depend on operator judgment (Superpowers' hard-gate approval, BMAD's interactive elicitation) are being measured with that asset deliberately removed.
- **Best workflow for non-Next.js stacks.** Spec Kit, in particular, is spec-format-biased and may rank differently on stacks where the structured-spec advantage is smaller.
- **Best workflow at scale > 5 iterations or > 10k LOC.** Maintainability over 5 phases is not the same as maintainability over 50.
- **Best workflow under tight time pressure.** Wall-clock time is captured but not weighted in the ranking. A workflow that takes 4× longer to produce the same result is not penalized here — it would be in a real project.
- **Workflow vs. model contribution.** The experiment holds model class constant. It does not isolate "this workflow plus a weaker model" vs. "no workflow plus a stronger model."

## Acknowledged confounds

| Confound | Rationale for accepting it | Where it might bias the result |
|----------|---------------------------|--------------------------------|
| N=1 operator (Muxin) | A solo experiment is what's available. Randomized run order distributes learning effects across workflows rather than concentrating them. | Late runs may benefit from operator familiarity with the tool. |
| Spec-format bias | A uniform `PROJECT_SPEC.md` is the fairest *practical* input but not the most neutral one. Spec-first workflows are designed for this format. | Likely favors Spec Kit and BMAD over more conversational workflows. |
| Next.js-only | Stack diversity is an entire follow-on experiment. | Workflows that have Next.js-specific tooling (Vercel-flavored, etc.) get an unfair leg up. |
| Autonomous-only | Skill drift across trials would be a worse confound. Trading ecological validity for internal validity is the right call. | Penalizes workflows whose value is operator-collaborative. |
| n=3 only at Phase 1 | Full-phase replicates would cost 5× compute. Phase 1 is the cleanest signal for variance. Replicates are forked from `experiment/<framework>` into `experiment/<framework>-r1`, `-r2`, `-r3`; median-LOC run becomes the representative; Phases 2–5 run on that. | Variance estimate doesn't account for compounding drift across iterations. |
| Model fixed (Sonnet/Opus class) | Lets the workflow be the independent variable. | Cannot separate "this workflow needs Opus" from "this workflow is good." |
| Rubric isolation only for Runs 4–5 | Runs 1–3 were intentionally rubric-exposed as the "what not to do" demonstration. Their data is documented as failure-mode reference (see `docs/LEARNINGS.md` Learning 009), not as comparable data. | Aggregating across all runs would invalidate cross-workflow comparison; the experiment uses only Runs 4–5+ for ranking. |

## How to talk about results publicly

### Cohort Slack post template

> Quick update on the workflow experiment: ranked autonomous performance of 5 AI coding workflows on a single Next.js project across 5 iteration phases. **Important caveat:** this is "best workflow when run autonomously on this kind of project," not "best workflow." Workflows that depend on a human in the loop are being measured with that asset removed on purpose. Specifically, results don't tell you which workflow is best when *you* are driving — they tell you which one survives without you. With that frame: [insert ranking]. Methodology + raw data: [link to ANALYSIS.md and metrics/].

### Webinar opener template (2 paragraphs)

> "I built the same Next.js civic tool five times — once with each of five AI coding workflows. Same model class, same spec, same starting scaffold, no human in the loop. Then I added Spanish, then real APIs, then three more languages including Arabic right-to-left, then on-site LLM chat. The question wasn't *which one builds v1 best* — that's a one-shot question. It was *which one produces a codebase that stays maintainable as it grows*, because that's the question that actually matters when you're choosing a workflow for real work."
>
> "Here's the asterisk I'm starting with: this is autonomous execution. A workflow whose biggest strength is collaborating with a thoughtful operator is being measured here with that strength removed. So the question this experiment can answer is narrower: *given that I don't want to babysit my workflow, which one degrades least gracefully?* That's a real question — most of us don't actually want to babysit. But it's not the same as 'which workflow is best for skilled human operators,' and I won't claim the result transfers that far."

## Cross-check against EXPERIMENT_DESIGN.md

Every limitation listed in `docs/EXPERIMENT_DESIGN.md § "Known Limitations"` must also appear in this document. If `EXPERIMENT_DESIGN.md` is updated to acknowledge a new confound, this file gets updated too. If this file ever claims something broader than `EXPERIMENT_DESIGN.md` admits, that's a framing drift bug and must be reconciled before any public communication.
