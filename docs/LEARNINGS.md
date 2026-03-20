# Experiment Learnings

Observations and course corrections discovered during the experiment. These inform the methodology and should be referenced in the Phase 3 write-up.

---

## Learning 001: Framework Workflows Were Bypassed in Phase 1 (Runs 1–4)

**Date discovered:** 2026-03-18
**Affects:** Phase 1 Runs 1–4 (Vanilla, Compound Engineering, Superpowers, Spec Kit)
**Severity:** Critical — invalidates the independent variable

### What happened

Claude Code did not use any framework-specific workflow commands during Phase 1 builds. Instead of following each framework's intended methodology (e.g., `/ce:plan` → `/ce:work` → `/ce:review` → `/ce:compound` for Compound Engineering, or `/speckit.specify` → `/speckit.tasks` → `/speckit.implement` for Spec Kit), Claude Code read the spec and coded the app directly — identical behavior across all branches.

### Root cause

Three compounding factors:

1. **Generic `/start` command.** The `/start` command was identical on all branches. It contained a single soft instruction: *"If the workflow has its own slash commands or skills, use them as the workflow intends."* This was guidance, not enforcement. The command then immediately proceeded to "Build autonomously," giving CC an easy path that bypassed the frameworks entirely.

2. **No framework-specific CLAUDE.md.** The `.claude/CLAUDE.md` was identical across all branches (including Vanilla). No branch had instructions like "You MUST use `/ce:plan` before writing any code" or "Follow the Spec Kit workflow sequence."

3. **Model default (Sonnet).** Sonnet is the default Claude Code model. It is more likely to take shortcuts through soft/permissive instructions than Opus. With no hard enforcement, Sonnet followed the path of least resistance.

### What this means

The experiment was measuring "Claude Code with framework files present in `.claude/`" rather than "Claude Code using the framework's methodology." The independent variable (workflow framework) was not actually varied — all runs were effectively Vanilla with extra unused files.

### Specific framework features that were never exercised

**Compound Engineering (47 skills, 28 agents):**
- `/ce:compound` — the signature knowledge-compounding command (5 parallel subagents documenting solutions in `docs/solutions/`)
- `/ce:plan`, `/ce:work`, `/ce:review` — the core workflow loop
- 14 review agents (security-sentinel, performance-oracle, architecture-strategist, etc.)
- 5 research agents, swarm orchestration

**Spec Kit (9 commands):**
- Only `/speckit.specify` and `/speckit.plan` were used (spec + plan creation)
- `/speckit.tasks` (task breakdown), `/speckit.implement` (automated execution), `/speckit.analyze` (consistency analysis) were all skipped
- RUN_LOG explicitly noted: *"Implementation proceeded autonomously without invoking full Spec Kit task generation or implementation commands"*

**Superpowers (14 skills, 1 agent):**
- Session-start hook fired (injecting context), but no evidence of skill invocation
- `subagent-driven-development` (fresh subagent per task with 2-stage review) — never used
- `test-driven-development` Iron Law ("no production code without a failing test first") — never enforced
- `code-reviewer` agent — never dispatched

**BMAD (13 agents, 39 skills, 25 workflows):**
- Not yet run (was scheduled as Run 5), but at high risk of same bypass

### Corrective action

Phase 1 will be re-run with the following changes:

1. **Framework-specific `/start` commands** — each branch gets a tailored `/start` that explicitly chains the framework's commands in the intended sequence
2. **Framework-specific CLAUDE.md additions** — each branch's CLAUDE.md includes hard enforcement: "You MUST follow this workflow. Do not skip commands."
3. **Decision-making protocol** — when a framework command asks for interactive input, Claude Code uses `docs/PROJECT_SPEC.md` as the source of truth and makes reasonable defaults without stopping
4. **Model: Opus** — better instruction following for complex multi-step workflows
5. **New branches from `v0-scaffold`** — original branches preserved as experiment data documenting this learning

### Impact on results

**Vanilla (Run 1) results are kept.** Vanilla has no framework to bypass — its Run 1 results are valid and serve as the baseline. The original `workflow/vanilla` branch and its `vanilla-phase1-complete` tag remain authoritative.

**Runs 2–4 (Compound Engineering, Superpowers, Spec Kit) are invalidated.** Their original branches are preserved as experiment data (tagged `run1-*-final`) but their metrics are excluded from Phase 3 analysis. Run 5 (BMAD) was never executed.

**Re-run branches use `run2/` prefix** (e.g., `run2/compound-engineering`) to distinguish from original branches. Run order is unchanged: 1. Vanilla (kept), 2. Compound Engineering, 3. SuperPowers, 4. Spec Kit, 5. BMAD.

### Why this matters for the write-up

This is itself a finding worth reporting: **workflow frameworks that rely on users explicitly invoking their commands will be bypassed in autonomous AI execution contexts unless hard enforcement exists.** The fact that 4 out of 5 runs produced nearly identical results despite very different frameworks installed tells you something about the gap between "framework available" and "framework actually used." The re-run with explicit enforcement tests the complementary question: do the frameworks produce meaningfully different results when their methodologies are actually followed?

---

## Learning 002: /start Command Gaps — Data Capture Hardening Before Run 2

**Date discovered:** 2026-03-20
**Affects:** All future runs (Run 2 onward)
**Severity:** Moderate — gaps would reduce data quality and reproducibility

### What was found

Pre-execution review of the `/start` command against `EXPERIMENT_DESIGN.md` revealed 9 gaps between what the experiment needs to measure and what `/start` actually captures. These were identified and resolved before any Run 2 execution began.

### Gaps and decisions

1. **Main branch `/start` stale** — Operator protocol said "run `/start` from main" but main's command still had old generic code from Learning 001. The run2 branch-specific `/start` commands would never be reached.
   **Decision:** Changed protocol to "checkout branch first, then `/start`." Updated EXPERIMENT_DESIGN.md and main's `/start` to redirect if invoked during Phase 1/2.

2. **No wall-clock time capture** — "Time to complete" is an experiment metric but no machine-readable timestamps were logged.
   **Decision:** Added automated start/end timestamps to `metrics/timing.jsonl` in each branch's `/start`.

3. **No workflow command execution log** — Can't verify post-hoc that frameworks were actually exercised. If Learning 001 recurs at a subtler level (one command skipped), there's no audit trail.
   **Decision:** Added `metrics/workflow-log.jsonl` with structured entries (step name, status, timestamp) around each framework command. Phase 3 analysis will verify expected commands were all executed.

4. **No pre-build verification** — No sanity checks that framework files, measurement scripts, e2e tests, and stub data are present before building.
   **Decision:** Added pre-flight checks. Build stops if infrastructure is missing.

5. **No Phase 2 starting-point enforcement** — Phase 2 should start from Phase 1 completion tag but nothing verified this.
   **Decision:** Added tag verification before Phase 2 builds proceed.

6. **No acceptance criteria gating** — `/start` tags the branch regardless of test results (e.g., 0/42 e2e tests).
   **Decision:** Kept as-is intentionally. Poor results are a finding about the workflow's quality, not an error to block. Tag it, log it, analyze it in Phase 3.

7. **No Phase 1→2 delta reporting** — "The delta between Phase 1 and Phase 2 metrics is where the most important signal lives" but metrics were reported without comparison.
   **Decision:** Added automatic Phase 1 vs Phase 2 comparison in the post-measurement debrief for Phase 2 runs.

8. **Qualitative scorecard too heavy** — Pre-run self-assessment and structured 1-5 ratings aren't useful when execution is autonomous. Muxin is hands-off during builds.
   **Decision:** Stripped scorecard to lightweight post-run debrief. Automated timing replaces manual session timestamps. `/start` asks targeted questions; Muxin answers or skips.

9. **No test generation tracking** — "Did the workflow generate tests?" is a key research question but wasn't tracked.
   **Decision:** Added post-build count of workflow-generated test files (files matching `*.test.*` or `*.spec.*` in `src/`, distinct from the shared Playwright e2e suite). Whether a workflow forces test creation is observed, not mandated.

### Why this matters

Learning 001 was about the independent variable not being varied. Learning 002 is about the dependent variables not being measured. Both must be fixed for the experiment to produce useful data. Together they represent the difference between "install the framework" and "run a rigorous experiment using the framework."

---

## Learning 004: /start Refactored to Single Entry Point + Remaining Ambiguities

**Date:** 2026-03-20
**Affects:** All future runs
**Severity:** Low-moderate — refactor complete, but 3 ambiguities remain before first run

### What was done

Refactored the `/start` command system to eliminate operator branch management and reduce duplication:

1. **Main's `start.md` is now the single entry point.** It auto-reads RUN_LOG `## Next`, auto-checkouts the target branch, runs pre-flight checks, delegates to the branch's `workflow.md`, handles all post-build measurement/debrief/RUN_LOG update.
2. **Framework-specific workflow steps extracted to `workflow.md`** on each run2/ branch. Each file has `## Meta` (framework name, tag prefix, verification path), `## Workflow Steps` (the framework methodology), and `## Adherence Check` (artifact verification commands).
3. **Branch start.md files replaced with redirect stubs** — if someone accidentally runs `/start` from a branch, they're told to go to main.
4. **Model self-reporting** replaces hardcoded `"model":"claude-sonnet-4-6"` in timing.jsonl. Claude Code identifies its own model from system context.
5. **Operator protocol updated** in EXPERIMENT_DESIGN.md and RUN_LOG to remove manual checkout steps.

**Commits:**
- `662518e` (main) — new start.md
- `ba05a7b` (main) — docs updates
- `65672e0` (run2/compound-engineering) — workflow.md + stub
- `ddc4087` (run2/bmad) — workflow.md + stub
- `72dedab` (run2/superpowers) — workflow.md + stub
- `676301f` (run2/spec-kit) — workflow.md + stub

### Remaining issues to fix before first run

Three ambiguities were identified during sanity check but not yet resolved:

**Issue A: Phase vs Run number ambiguity.** The RUN_LOG says "Phase 1 Re-Run — Run 2: Compound Engineering." Start.md says "Determine the phase type (Phase 0, 1, 2, or 3) from the text." The word "Phase 1" and "Run 2" both contain numbers. Claude needs explicit disambiguation:
- **Phase** = experiment phase (1 = build from scratch, 2 = extend with Spanish)
- **Run** = iteration number (Run 1 = original invalidated runs, Run 2 = re-runs with enforcement)
- "Phase 1 Re-Run" means Phase 1. "Run 2" is NOT Phase 2.

**Fix:** Update Step 1 of start.md to explicitly define these terms and how to parse them.

**Issue B: No "fresh build" context.** When workflow.md fires, nothing tells Claude "this branch has scaffold + framework installed but NO existing ballot tool code — you are building the app from scratch." The branch state IS correct (run2/ branches fork from framework install points), but Claude could wonder if it's continuing from existing work.

**Fix:** Add a note after checkout (Step 3 or Step 6) saying: "This is a Phase 1 build. The branch has the framework and scaffold but no application code yet. Build the ballot tool from scratch per the spec."

**Issue C: Tag format hardcodes `run2`.** Step 7g says `<TAG_PREFIX>-run2-phase<N>-complete`. This should derive the run number from the branch name prefix rather than hardcoding it. Currently works, but fragile.

**Fix:** Update Step 7g to extract run number from branch name (e.g., `run2/` → `run2`).

### Why this matters

The refactor eliminated a significant UX burden (manual branch management) and a maintenance burden (4-way duplication of infrastructure code). The remaining issues are about making the prompt unambiguous enough that Claude Code can't misinterpret the context. For an experiment where "did the workflow actually run correctly" is the core question, prompt clarity is load-bearing.
