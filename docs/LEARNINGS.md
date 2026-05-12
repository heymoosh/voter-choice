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

---

## Learning 005: Skill Invocation vs. File Reading — CE Multi-Agent Engine Never Activated

**Date discovered:** 2026-03-20
**Affects:** Phase 1 Run 2 (Compound Engineering re-run on `run2/compound-engineering`)
**Severity:** Critical — CE's core value proposition (multi-agent orchestration) was never exercised

### What happened

The Run 2 CE build followed the 4-step sequence (ce:plan → ce:work → ce:review → ce:compound) and produced all expected artifacts (plan file in `docs/plans/`, solution doc in `docs/solutions/`, 7 workflow-log entries). The RUN_LOG recorded "Full CE adherence." Post-run deep review revealed this was wrong — Sonnet followed CE's *templates* but never activated CE's *engine*.

### What was skipped

| CE Step | What SKILL.md prescribes | What Sonnet actually did |
|---------|--------------------------|--------------------------|
| ce:plan | Spawn `repo-research-analyst` + `learnings-researcher` agents in parallel, optionally `best-practices-researcher` + `framework-docs-researcher`, run `spec-flow-analyzer` | Read PROJECT_SPEC.md, wrote plan using SKILL.md template format. Zero agents spawned. |
| ce:work | Create TodoWrite task list, system-wide test checks per task | Built systematically with commits (partial compliance). No TodoWrite, no system-wide checks. |
| ce:review | Load review agents from `compound-engineering.local.md`, spawn parallel review agents (security-sentinel, performance-oracle, etc.), create todo files in `todos/` | Self-reviewed in single pass, found 3 real issues, applied fixes directly. No agents, no todos/ directory. |
| ce:compound | Spawn 5 parallel sub-agents (Context Analyzer, Solution Extractor, Related Docs Finder, Prevention Strategist, Category Classifier) | Single-pass write of solution doc. Zero agents spawned. |

### Root cause

Two compounding factors:

1. **"Read and follow" ≠ skill invocation.** The experiment's `workflow.md` said "Read and follow `.claude/skills/ce-plan/SKILL.md`" for each step. This made Sonnet read the SKILL.md as reference text — it extracted the output format/template and skipped multi-agent orchestration instructions. CE skills are designed to be *invoked* through the skill system, not *read as prose*. When invoked, the model treats instructions as an executable procedure. When read, it treats them as a reference to cherry-pick from.

2. **CE already has autonomous orchestration (`/lfg`) that the experiment didn't use.** CE ships with `/lfg` ("Let's Fucking Go") — a fully autonomous pipeline that chains `ce:plan → deepen-plan → ce:work → ce:review → resolve_todo_parallel` with GATE checks between steps. It has `disable-model-invocation: true` frontmatter (designed for user-invoked autonomous execution). The experiment's `workflow.md` reinvented `/lfg` poorly by writing custom step-by-step instructions pointing to SKILL.md files.

### How CE is designed to be used

| Mode | Mechanism | Who triggers |
|------|-----------|--------------|
| **Manual** | Human types `/ce:plan`, reviews, types `/ce:work`, etc. | Human per step |
| **Autonomous** | Human types `/lfg "build X"` once, walks away | Human once, CE chains everything |
| **Swarm** | Human types `/slfg "build X"`, parallelizes work + review | Human once, CE parallelizes |

The experiment wanted autonomous mode but built a custom driver that bypassed the skill invocation mechanism entirely.

### Artifact-based adherence checking is insufficient

The post-build adherence check verified:
- Plan file exists in `docs/plans/` ✓
- Solution file exists in `docs/solutions/` ✓
- Workflow-log entries exist for all 4 steps ✓

All checks passed. But the *process* that produced those artifacts was fundamentally different from CE's design. A single-agent build mimicking the output format passes the same checks as a multi-agent build using the actual framework. **Adherence checks must verify process, not just artifacts.**

### Technical detail: skills/ vs commands/

CE installs its skills to `.claude/skills/` (agent-invocable). The Skill tool only works for commands in `.claude/commands/` (user-invokable). To invoke `/lfg` via the Skill tool from `workflow.md`, it needs to be in `commands/`, not `skills/`.

### Corrective action

1. Create new branch `run3/compound-engineering` from the last infrastructure commit (`65672e0`) on `run2/compound-engineering`
2. Copy `/lfg` SKILL.md to `.claude/commands/lfg.md` so it's user-invokable
3. Rewrite `workflow.md` to invoke `/lfg` via the Skill tool instead of manually sequencing "read and follow" instructions
4. Use Opus — Sonnet consistently simplifies multi-agent orchestration even with enforcement
5. Old branches (`run2/compound-engineering`, `workflow/compound-engineering`) preserved as experiment data

### Why this matters for the write-up

This is a second-order version of Learning 001:
- **Learning 001:** Frameworks aren't used at all (no enforcement → model takes shortest path)
- **Learning 005:** Framework steps are followed in sequence, but the framework's engine is not activated ("read and follow" enforcement → model follows templates, skips multi-agent orchestration)

The progression reveals a spectrum of framework adoption failures:
1. No enforcement → framework ignored entirely
2. Step-sequence enforcement → templates followed, engine skipped
3. Skill invocation enforcement → (to be tested with `/lfg` on `run3/compound-engineering`)

For the experiment: **adherence is not binary.** A framework can be "followed" at the artifact level while its core methodology (the thing that differentiates it from vanilla) is completely bypassed.

---

## Learning 006: "Read and Follow" Problem Affects All Plugins, Not Just CE

**Date discovered:** 2026-03-20
**Affects:** All run2/ and run3/ branches (Superpowers, Spec Kit, BMAD — plus CE which was already caught in Learning 005)
**Severity:** Critical — every workflow.md uses the same broken invocation pattern

### What was found

Post-mortem audit of all four `workflow.md` files revealed that every single one uses the identical "Read and follow `.claude/skills/…/SKILL.md`" pattern that Learning 005 identified as broken for CE. The CE fix (Learning 005 → run3 branch with `/lfg` skill invocation) was treated as CE-specific, but the root cause is structural — it's how all workflow.md files were written in Learning 004's refactor.

### The pattern in each workflow.md

| Plugin | Pattern used | File location | Steps affected |
|--------|-------------|---------------|----------------|
| **CE** | "Read and follow `.claude/skills/ce-plan/SKILL.md`" | skills/ | 4 steps (already fixed via run3) |
| **Superpowers** | "Read and follow `.claude/skills/brainstorming/SKILL.md`" | skills/ | 6 steps |
| **Spec Kit** | "Read and follow `.claude/commands/speckit.specify.md`" | commands/ | 6 steps |
| **BMAD** | "Read and follow `.claude/skills/bmad-create-product-brief/SKILL.md`" | skills/ | 8 steps |

### What each plugin loses under "read and follow"

**Superpowers (severity: HIGH)**
- `subagent-driven-development` — parallel task execution with fresh subagent per task, 2-stage review gates (spec compliance reviewer + code quality reviewer). The framework's core differentiator. Never spawned.
- `spec-document-reviewer` and `plan-document-reviewer` subagents — review loops after brainstorming and planning steps. Never dispatched.
- `code-reviewer` subagent — post-implementation review. Never dispatched.
- Three "Iron Laws" (TDD: "no production code without a failing test first"; systematic-debugging: "no fixes without root cause investigation first"; verification-before-completion: "no completion claims without fresh verification evidence"). Referenced in workflow.md but when read as prose, the enforcement mechanism degrades — the model knows about them but doesn't feel bound by them the way it would when the skill is invoked and the instructions arrive as an executable procedure.

**BMAD (severity: HIGH)**
- Step-file architecture — BMAD workflows use numbered step files (`step-01-init.md`, `step-02-discovery.md`, etc.) that execute sequentially. "Read and follow" the top-level SKILL.md won't trigger loading these substeps.
- Agent persona loading — each of BMAD's 13 agents (PM, Architect, Dev, QA, Scrum Master, etc.) loads a persona file with communication style, principles, and specialized knowledge. Never loaded.
- `bmad-quick-dev-new-preview` — a 5-step pipeline with 3 parallel adversarial reviewers (blind hunter, edge case hunter, acceptance auditor). Exists in the framework but isn't even referenced in our workflow.md.
- `bmad-party-mode` — multi-agent discussion orchestration. Not referenced.

**Spec Kit (severity: LOWER)**
- Spec Kit commands live in `.claude/commands/` (not `skills/`), so they CAN be invoked via the Skill tool — making this the easiest plugin to fix.
- Spec Kit's commands are simpler than the others — structured prompts that generate artifacts, not multi-agent orchestration. The damage from "read and follow" is less severe.
- However, `speckit.implement` has structured task execution with checklist validation and dependency ordering that will be simplified when read as prose rather than invoked as a procedure.

### Do the other plugins have a `/lfg` equivalent?

A key part of the CE fix was discovering that CE already shipped with `/lfg` — a built-in autonomous pipeline. Audit of the other three plugins:

| Plugin | Built-in autonomous pipeline? | Details |
|--------|-------------------------------|---------|
| **CE** | **Yes** — `/lfg` | Chains plan→deepen→work→review→resolve. User invokes once. (Already used in run3 fix.) |
| **Superpowers** | **No** | Framework expects manual skill invocation per step. Deprecated its own commands (brainstorm.md, write-plan.md, execute-plan.md) in favor of skills. No single "run everything" command. |
| **Spec Kit** | **No** | Individual commands only, no chaining command. But all commands are in `commands/` so each can be individually Skill-invoked. |
| **BMAD** | **Partial** — `bmad-quick-dev-new-preview` | 5-step pipeline (clarify→plan→implement→adversarial review→present) with sub-agent dispatch. But it's a skill (in `skills/`), not a command. Also has `bmad-master` agent with menu-driven orchestration. |

### Technical constraint: skills/ vs commands/

The Skill tool only invokes files in `.claude/commands/`. Files in `.claude/skills/` are designed to be activated by the model's internal skill system (triggered by the `using-superpowers` SKILL.md or CE's skill-matching logic), not by the Skill tool.

This means:
- **Spec Kit** — commands are already in `commands/`. Can be Skill-invoked with no file moves.
- **Superpowers** — all functionality is in `skills/`. Cannot be Skill-invoked without copying to `commands/`.
- **BMAD** — all functionality is in `skills/`. Cannot be Skill-invoked without copying to `commands/`.
- **CE** — already fixed by copying `/lfg` to `commands/` on run3 branch.

### Root cause (why all workflow.md files have this problem)

Learning 004 created the `workflow.md` system. The design assumed that "Read and follow [SKILL.md]" would produce the same behavior as invoking the skill — that the model would treat the instructions as procedural regardless of how they arrived. Learning 005 proved this assumption wrong for CE. This audit proves it wrong for all plugins.

The assumption was reasonable — the instructions are the same text either way. But the invocation mechanism changes how the model relates to the text:
- **Invoked via Skill tool:** Instructions arrive as "you are now executing this procedure." The model treats them as binding.
- **Read via Read tool:** Instructions arrive as "here is a reference document." The model treats them as advisory — extracting templates and output formats while skipping orchestration steps it judges unnecessary.

### Corrective action

Create new run3/ branches for all three remaining plugins (Superpowers, Spec Kit, BMAD) with workflow.md files rewritten to use proper invocation mechanisms. The run2/ branches are preserved as experiment data.

**Spec Kit (simplest fix):**
- Create `run3/spec-kit` from the last infrastructure commit on `run2/spec-kit`
- Rewrite `workflow.md` to invoke each `speckit.*` command via the Skill tool instead of "read and follow"
- No file moves needed — commands are already in `commands/`

**Superpowers:**
- Create `run3/superpowers` from the last infrastructure commit on `run2/superpowers`
- Copy key skills to `.claude/commands/` so they can be Skill-invoked: `brainstorming`, `writing-plans`, `subagent-driven-development` (or `executing-plans`), `requesting-code-review`, `verification-before-completion`, `finishing-a-development-branch`
- Rewrite `workflow.md` to invoke each step via the Skill tool
- Keep originals in `skills/` — the copied commands reference them

**BMAD:**
- Create `run3/bmad` from the last infrastructure commit on `run2/bmad`
- Copy `bmad-quick-dev-new-preview` to `.claude/commands/` as the autonomous pipeline (analogous to CE's `/lfg`)
- If quick-dev-new-preview doesn't cover BMAD's full analysis→planning→solutioning→implementation pipeline, copy individual phase skills to commands instead
- Rewrite `workflow.md` to Skill-invoke the pipeline or individual phase commands

**All branches:**
- Use Opus (consistent with CE run3 decision)
- Add process-level adherence checks: verify subagent dispatch (check for Agent tool usage in the session), not just artifact existence

### Updated spectrum of framework adoption failures

1. **No enforcement** → framework ignored entirely (Learning 001)
2. **Step-sequence enforcement via "read and follow"** → templates followed, engines skipped (Learning 005, this learning)
3. **Skill invocation via Skill tool** → engine activated (CE run3, to be tested for remaining plugins)

Level 2→3 requires that the skill be in `.claude/commands/`. The `skills/` → `commands/` distinction in Claude Code's architecture is load-bearing for whether a framework's methodology actually executes.

### Why this matters for the write-up

This generalizes Learning 005 from a CE-specific bug to a systemic design flaw in the experiment's invocation mechanism. It also reveals a practical finding for framework authors: **if your framework installs to `.claude/skills/` and has no commands in `.claude/commands/`, it cannot be autonomously invoked by an orchestrating prompt.** The framework's methodology can only activate if (a) the model's own skill-matching logic triggers it, or (b) someone copies the skills to commands. For autonomous experiment contexts, (b) is the only reliable path.

---

## Learning 007: Gap Analysis — Model Consistency, CE Caveats, TDD Enforcement, and BMAD Scope

**Date discovered:** 2026-03-23
**Affects:** All run3/ branches and Phase 2 planning
**Severity:** Mixed — one critical fix (TDD), several moderate decisions

### What was found

A systematic review of experiment design goals vs. actual implementation revealed 7 gaps. Three decisions were made and four infrastructure fixes applied.

### Decision 1: Model — Sonnet for all runs (accepted)

Learning 005/006 recommended Opus for run3 branches, but `timing.jsonl` on both CE and Superpowers branches shows `"model":"claude-sonnet-4-6"`. The model is configured at the Claude Code application level, not per-branch.

**Decision:** Accept Sonnet for all remaining runs (Superpowers, Spec Kit, BMAD). Rationale:
- Consistency with completed runs (CE and Vanilla both used Sonnet)
- The Skill invocation fix (Learning 005/006) was the primary correction; Opus was belt-and-suspenders
- If Skill invocation enforcement works on Sonnet, that's a stronger finding than "it only works on Opus"
- Model inconsistency across runs would introduce a new confound

### Decision 2: CE Run 3 — Accept with documented caveats (no re-run)

CE run3 had two significant deviations:
1. **`ce:compound` skipped** — context budget exhausted after review+resolve. CE's signature knowledge-compounding feature (5 parallel sub-agents) was never exercised.
2. **`/lfg` not Skill-invoked** — the slash command wasn't registered, so the pipeline was executed by reading lfg.md. This is the same "read and follow" pattern Learning 005 identified as broken.

Despite this, CE produced excellent metrics: 42/42 e2e (100%), 0 ESLint errors, Lighthouse 100/100/100/100.

**Decision:** Accept results. Rationale:
- Experiment design principle: "poor results are findings, not errors to block" (Learning 002, decision 6)
- Re-running creates learning-effect confounds (would be 4th attempt at same build)
- Deviations are documented — Phase 3 can account for them
- CE's plan+work+review pipeline strength even when partially degraded is itself a finding

**Write-up footnotes required:** (a) ce:compound untested; (b) multi-agent orchestration within individual steps may have been simplified due to read-and-follow invocation.

### Decision 3: BMAD multi-agent features — defer to Phase 2

BMAD's `bmad-party-mode` (multi-agent discussion) and adversarial reviewers from `bmad-quick-dev-new-preview` (blind hunter, edge case hunter, acceptance auditor) are NOT in the current 10-step workflow.

**Decision:** Accept for Phase 1. The current 10-step workflow is already the most elaborate of any framework. Revisit before Phase 2 — if BMAD Phase 1 review quality is weak, add adversarial reviewers.

### Fix 1: Superpowers TDD — "read and follow" pattern survived (CRITICAL)

The Superpowers `workflow.md` and `CLAUDE.md` both referenced TDD via: *"Follow the TDD Iron Law from `.claude/skills/test-driven-development/SKILL.md`"* — the exact broken pattern Learning 005/006 identified. The TDD skill is in `skills/`, not `commands/`, so it can't be Skill-invoked and degrades to advisory prose.

**Impact:** Without enforcement, Superpowers would produce zero unit tests (like Vanilla and CE), losing the experiment's best chance to observe TDD as a differentiator.

**Fix applied:** Inlined the full TDD Iron Law directly into `workflow.md` AUTONOMOUS RULES and `CLAUDE.md` as hard constraint text. No file reference, no "read and follow." Commit `d2e66fe` on `run3/superpowers`.

### Fix 2: Vanilla workflow.md for Phase 2

The refactored `/start` command requires `workflow.md` on every branch. Vanilla completed Phase 1 before the refactor. Phase 2 would fail at pre-flight Step 3c.

**Fix applied:** Created minimal `workflow.md` on `workflow/vanilla` that preserves vanilla's no-framework identity while satisfying infrastructure requirements. Commit `aae3358` on `workflow/vanilla`.

### Fix 3: measure.mjs enhancements

Added two missing data points to the metrics JSON output:
- `workflowTests`: count of workflow-generated test files in `src/` (previously captured in debrief text but not in JSON)
- `workflowTiming`: parsed step durations from `metrics/workflow-log.jsonl` (previously required manual JSONL analysis)

### Fix 4: Post-hoc process adherence analysis

Created `scripts/analyze-adherence.mjs` for Phase 3 analysis. Verifies process-level adherence beyond artifact checks:
- TDD compliance: test file commit timestamps vs. implementation timestamps
- Commit pattern analysis: test-related vs. implementation-only commits
- Workflow log completeness per framework's expected steps

### Why this matters

This gap analysis revealed a spectrum of experiment infrastructure maturity:
- **Independent variable (framework used):** Fixed by Learnings 001, 005, 006
- **Dependent variables (metrics captured):** Fixed by Learning 002, enhanced here
- **Enforcement fidelity (framework actually runs at full capability):** This learning — TDD survived as a "read and follow" reference even after two rounds of fixes targeting exactly this pattern

The TDD finding is particularly instructive: **fixing a class of bugs doesn't mean you've fixed every instance.** The Learning 005/006 fixes correctly moved skills to commands and rewrote workflow.md invocations. But the TDD reference was embedded in AUTONOMOUS RULES prose, not as a standalone step, so it was missed. Pattern-based fixes need pattern-based verification.

---

## Learning 008: LLM Codebase Scaling — Degradation Thresholds

**Date discovered:** 2026-04-03
**Context:** Post-BMAD Phase 2 debrief observation

### Observation

At ~2k LOC (current scale), errors are already appearing but are fixable:
- Session context limit hit mid-build (BMAD story 4.2 split across two contexts)
- Parallel translation stores diverged silently: `translations.ts` `deadline.tomorrow` ES = "¡Mañana!" while `DEADLINE_LABELS.es.tomorrow` = "Queda 1 día" — two sources of truth for the same string, both passing tests
- Pre-existing Prettier formatting issues went undetected until a full build was triggered

These are early-warning signs of the coherence failures that become reliable at larger scales.

### Degradation thresholds (src/ application code only)

| Scale | Files | LOC | Primary failure modes |
|-------|-------|-----|----------------------|
| 🟢 Green | < 40 | < 3k | High coherence; errors fixable in session |
| 🟡 Yellow | 40–100 | 3–10k | Stale-context errors; hallucinated imports; type drift (`any` casts); test drift |
| 🔴 Red | > 100 | > 10k+ | Multi-file refactors have silent partial failures; "passes build but wrong" bugs; agents can't hold full dependency graph |

### Specific patterns that fail first

1. **Parallel string stores** — Already observable here at 46 translation keys × 2 languages. At 200+ keys or 3+ languages, keeping multiple string stores synchronized across stories becomes exactly the kind of multi-file coherence problem LLMs fail at silently.
2. **Cross-file type threading** — Agents start adding `as any` casts to escape TypeScript errors rather than tracing the correct type through 15+ files.
3. **Context window saturation** — Agents can't hold the full file graph; start guessing what's relevant, missing cascading changes.
4. **Test drift** — New code added without tests because the agent doesn't know what's already covered.

### Implication for this experiment

Frameworks with strict story-level isolation (BMAD, Spec Kit) degrade more gracefully at larger scales because each story limits context scope. Vanilla Claude Code on a 20k LOC codebase with no workflow structure would choke much earlier than BMAD on the same codebase. **This is a meaningful differentiator that the Phase 3 write-up should address** — the relative value of structured workflows likely increases as codebase size grows.

### Action

Include a codebase scale health check in every `/start` operator debrief (Step 7, item 9). Report src/ LOC + file count + Green/Yellow/Red status against the thresholds above.

---

## Learning 009: Scoring Rubric Was Visible to Workflows During Runs 1–3 (Metric Gaming Vector)

**Date discovered:** 2026-04-08
**Affects:** All runs to date (workflow/*, run2/*, run3/*)
**Severity:** High — caveats all quantitative comparisons in ANALYSIS.md

### What happened

While planning the Hermes orchestrator and a new metrics suite (Semgrep, Stryker, axe, gitleaks), a review of main's `.claude/commands/start.md` revealed that the post-build auto-findings rubric was embedded directly in the command file Claude Code reads at invocation. Because Claude reads `/start.md` into context at Step 0 and executes its steps sequentially, every workflow run in this experiment has had full visibility of the scoring rubric BEFORE the workflow steps execute in Step 5.

Specifically, the rubric leaked:

* **Exact bundle size window:** "First load JS > 130 kB or < 85 kB (±20% from ~102 kB baseline)"
* **Zero-warning lint bar:** "eslintErrors > 0 OR eslintWarnings > 0" triggers a finding
* **Test generation expectation:** "`uniqueTestFiles` == 0 for a non-vanilla framework" — forces every non-vanilla workflow to produce tests regardless of whether its methodology calls for them
* **TDD scoring:** "tddScore < 100 OR implOnlyCommits > 0" — workflows learned their commit history would be inspected for TDD patterns
* **E2e threshold:** "e2eTotal < 42" — workflows knew the exact shape of the measurement
* **Data completeness gate script:** The full gate bash was in the file, telling workflows exactly which JSON fields would be checked

In addition, `scripts/measure.mjs` and `scripts/analyze-adherence.mjs` lived in the container-mounted `scripts/` directory, so any workflow could have `cat`'d them to learn the entire metric suite and its thresholds.

### Root cause

Two compounding errors:

1. **Convenience coupling.** The original `/start.md` was written as an all-in-one "do everything in one command" flow because the operator wanted a single invocation to trigger a complete build + measure + gate + log cycle. That coupling put scoring logic in the same file as workflow orchestration, which Claude reads in full before executing.
2. **Container mount scope.** `docker/run-claude.sh` bind-mounted the entire repo into `/workspace`, including `scripts/`, because at scaffold time there was no concept of "files the workflow should not see."

### Impact on experiment data

Every numeric comparison in `docs/ANALYSIS.md` is downstream of rubric-visible runs. Workflows may have optimized for the disclosed targets rather than for real code quality. In particular:

* **Bundle size rankings** are the most gameable — the 85-130 kB window is narrow enough that a workflow aware of it can pick dependencies to land inside it
* **Zero-warning ESLint rankings** are gameable by inserting `eslint-disable` comments or removing warning-emitting code
* **Test file counts for non-vanilla frameworks** are forced to be non-zero — any framework that would naturally produce zero tests was penalized, so "test count" rankings are an artifact of the rule rather than a measurement of framework behavior
* **TDD scores** are gameable by reordering commits (test-first commits before impl commits) even when the actual writing order was impl-first

The qualitative findings (framework activation, workflow command usage, subjective code quality) are unaffected because those depend on methodology observations, not rubric thresholds.

### Fix

1. **Scoring scripts moved out of container mount.** `scripts/measure.mjs` → `scoring/measure.mjs`, `scripts/analyze-adherence.mjs` → `scoring/analyze-adherence.mjs` on `main`. The `scoring/` path is masked by an empty tmpfs overlay in `docker/run-claude.sh`, so the container sees it as an empty directory. Workflows cannot read the scoring code.
2. **Scoring scripts refactored for external invocation.** Both scripts accept a `--repo <path>` argument so they can be invoked from a host-side `main` worktree against any branch worktree. Hermes runs them from outside the container after the container has exited.
3. **`/start.md` stripped of scoring logic.** Main's `/start.md` now only handles: pre-flight, clean env, execute `workflow.md`, commit, tag, push, exit. Measurement, adherence analysis, auto-findings rubric, data completeness gate, and RUN_LOG updates are all Hermes's responsibilities, executed from the host.
4. **`npm run measure` removed from `package.json`** so workflows cannot invoke the scoring pipeline even if they somehow reached the script.
5. **Per-branch `workflow.md` files verified clean.** Grep across all five (`run3/spec-kit`, `run3/superpowers`, `run3/bmad`, `run3/compound-engineering`, `workflow/vanilla`) confirmed no references to specific metrics, thresholds, or scoring tools. The only "accessibility" references are derived from `PROJECT_SPEC.md` functional requirements, not from the scoring suite. No changes needed.
6. **Hermes Agent Requirements doc updated** to explicitly cover post-container scoring responsibilities and a non-negotiable "scoring isolation" section.

### Legacy branches

Runs 1-3 branches (`workflow/*`, `run2/*`, `run3/*`) have the old `scripts/measure.mjs` and `scripts/analyze-adherence.mjs` baked into their git trees. Those files cannot be removed from those branches without modifying experiment data (which CLAUDE.md forbids). The Docker tmpfs mask was limited to `/workspace/scoring` specifically — it does not mask `/workspace/scripts` on legacy branches, because doing so would make git see the scoring files as deleted and corrupt the branch state on any `git add -A` or `git commit -a`.

**Consequence:** Legacy branches are permanently contaminated. They cannot be used for clean-run comparisons. Any re-runs of Spec Kit, Superpowers, BMAD, CE, or Vanilla must be done on new branches (run4/*, run5/*, etc.) created from a post-fix `main` commit where `scripts/` is absent from the scaffold.

### Action for Phase 3 write-up

1. Explicitly caveat the quantitative rankings in `docs/ANALYSIS.md` with a "Rubric-Visible Runs" note — these are not blind scores, they are scores against a disclosed target.
2. Separate the "forced test generation" finding for non-vanilla frameworks from any claim about framework testing culture — the rule created the behavior, the framework did not.
3. If new runs on post-fix branches are executed, compare their rankings head-to-head against the legacy rankings. Divergence is evidence of gaming; convergence is evidence that the rubric visibility did not meaningfully distort results.
4. Add "rubric isolation" to the methodology section as a lesson learned for anyone replicating this experiment. The one-line takeaway: "Never let the subject of evaluation read the scoring rubric before execution."

---

## Learning 010: In-container `measure.mjs` Calls Violate Hermes Isolation

**Date discovered:** 2026-05-12
**Affects:** v2 rebuild architecture and all future isolated runs
**Severity:** Critical — container-side measurement pierces the scoring boundary

### What happened

The v2 plan required masking `/workspace/scoring` and `/workspace/metrics` during workflow execution, but the orchestrator still instructed the build agent to run `node scoring/measure.mjs` inside the container and to treat the repo's canonical `metrics/` tree as the live build output location.

### Why this is a contradiction

- If `scoring/` is correctly masked, the in-container `measure.mjs` call fails.
- If `scoring/` is exposed so `measure.mjs` can run, Hermes isolation is broken.
- If `/workspace/metrics` is masked without a scratch mount, timing and workflow logs disappear during the build.

This is not a local bug. It is an architecture conflict between isolation and measurement responsibilities.

### Correct v2 pattern

- The container emits only `timing.jsonl` and `workflow-log.jsonl`.
- Those logs go to a per-run scratch dir bind-mounted at `/workspace/metrics`.
- Host path pattern: `metrics/run-outputs/<run-id>/`.
- After container exit, the host checks out the workflow branch, runs `measure.mjs`, merges the scratch timing/workflow logs into `metrics/<branch>/phase<N>.json`, then runs `compute-deltas.mjs` and `diff-hygiene.mjs`.

### Decision

Host-side scoring after container exit is the v2 pattern. Container-side workflows should never invoke `measure.mjs`, `compute-deltas.mjs`, or `diff-hygiene.mjs`.

## Learning 011: Worktree `.git` Is a Pointer File, Not a Directory

**Date discovered:** 2026-05-12
**Affects:** Hermes Docker worktree execution and all future smoke/full reruns
**Severity:** Critical — live container can silently lose Git history and branch state

### What happened

The first live Phase B smoke run mounted only the worktree path into Docker. That works for plain repos but not for Git worktrees: the worktree's `.git` file is just a pointer to the main repo's `.git/worktrees/<name>/` directory, and object/ref storage still lives in the main repo's `.git/`.

Inside the container, that absolute pointer target did not exist. Git therefore behaved as if the checkout had no history and the agent ended up operating in what looked like an uninitialized repository.

### Why this matters

- A dry-run sandbox can mask the issue because it never exercises real Git resolution through the worktree pointer file.
- The live container is the only trustworthy validation path for this bug class.
- If the main repo's `.git/` is missing, branch detection, tags, `git status`, `git log`, and commits can all break or silently target the wrong repository state.

### Correct v2 pattern

- Mount the worktree at its host absolute path inside the container.
- Mount the main repo's `.git/` at its host absolute path inside the container.
- Run the container with `-w <worktree-host-absolute-path>`, not a synthetic `/workspace` cwd.
- Keep the A5 regression check (`scripts/validate-container-git.sh`) in the verification loop before smoke/full experiment runs.

### Decision

Container mounts must include the main repo's `.git/` at its host absolute path. Dry-run mode cannot validate this; live container execution is the required test.

---

## Learning 012: `git add .` Inside Container Corrupts Workflow Branches Derived from `main`

**Date discovered:** 2026-05-12
**Affects:** Phase B smoke run and all future v2 workflow builds
**Severity:** Critical — silently deletes ~45k lines of experiment infrastructure from every workflow branch commit

### What happened

The Phase B smoke run (`experiment/vanilla-r1-v2`) was branched from `main`, which contains all experiment infrastructure: `docs/LEARNINGS.md`, `docs/RUN_LOG.md`, `scoring/*.mjs`, `metrics/experiment/**`, and similar. The container's Hermes tmpfs overlay correctly masks these paths during the build. But when the in-container build agent ran `git add .`, git saw the masked paths as deletions and recorded them in the commit.

The resulting commit (`7e1f5c5`) had 120 files changed: correctly added the Phase 1 app code (`src/`, `e2e/`) and emitted timing logs, but also deleted every docs, scoring, and metrics file that main had contributed to the branch — ~45k lines of experiment data removed from the branch history.

The `vanilla-r1-v2-phase1-complete` tag pointed to this contaminated commit.

### Why this matters

- The in-container Claude DID correctly build Phase 1 in ~6 minutes. The build itself is not broken.
- The bug is in the commit template: `git add .` is unsafe when infrastructure paths are masked by tmpfs.
- The contamination is silent — the container exits successfully and the tag is created, but the branch is now missing all experiment tooling needed for post-build host-side scoring and Phase 2+ runs.
- This is the same class of bug that Learning 009 identified for legacy `scripts/` paths, but the v2 expanded masking (docs/, metrics/) reintroduced it.

### Correct v2 pattern

In-container builds must use explicit `git add` with only application source paths:

```bash
git add src/ e2e/ public/ package.json package-lock.json
[ -d data/ ] && git add data/ || true
```

Never `git add .` and never `git add -A` inside the container. The Hermes-masked paths (docs/, scoring/, metrics/) appear deleted to git and must never be staged.

### Decision

The phase1_replicate and phase_forward templates in `.claude/commands/start.md` have been updated to use explicit path-scoped `git add`. See also `scripts/validate-container-claude.sh` (Learning 012 companion: trivial-prompt smoke test so auth/binary issues are caught in <1 minute rather than 13 minutes into a Phase 1 build).

---

## Learning 013: `docker run -it` Fails in Non-TTY Contexts; Claude Does Not Need TTY

**Date discovered:** 2026-05-12
**Affects:** All programmatic invocations of `docker/run-claude.sh` from subshells, script capture, or CI
**Severity:** Moderate — blocked validate-container-claude.sh and any scripted smoke testing

### What happened

`docker run -it` requires both stdin and stdout to be real terminals. When called from a subshell capture (`$(...)`) or scripted context (no terminal attached), Docker refuses with `the input device is not a TTY`. This affected `scripts/validate-container-claude.sh` and any future CI invocations.

`validate-container-git.sh` worked earlier because it was invoked directly from an interactive terminal (the Claude Code Bash tool), not from a subshell. Scripts that capture docker output via `$()` do not inherit the terminal TTY.

### Why Claude doesn't need TTY

`claude --bare --dangerously-skip-permissions -p "$PROMPT"` runs in non-interactive print mode. No spinner, no box drawing, no readline input. Allocating a pseudo-TTY is both unnecessary and harmful for scripted use.

### Fix

`docker/run-claude.sh` now checks whether stdin and stdout are real terminals before adding `-t`:
```bash
DOCKER_TTY_FLAGS=()
if [[ -t 0 ]] && [[ -t 1 ]]; then
  DOCKER_TTY_FLAGS=(-it)
fi
```

The `${DOCKER_TTY_FLAGS[@]+"${DOCKER_TTY_FLAGS[@]}"}` expansion is required with `set -u` to safely expand an empty array.

### Decision

`docker/run-claude.sh` is patched. Any worktree used for scripted testing must pick up this version. The fix applies to both the orchestration worktree and all workflow branch worktrees.

---

## Learning 014: Anthropic API Workspace Budget Gates Wall-Clock Progress — Plan Quota, Not Just Time

**Date discovered:** 2026-05-12
**Affects:** Phase B smoke run (halted at Phase 4), Phase C planning
**Severity:** High — 45-action Phase C is infeasible without a quota plan

### What happened

The Phase B vanilla smoke run completed Phases 1-3 and failed on Phase 4 (resume attempt) with:

> `API Error: 400 — You have reached your specified workspace API usage limits. You will regain access on 2026-06-01 at 00:00 UTC.`

Phase B Phases 4-6 and all of Phase C (45 actions) are blocked until the budget resets.

### Why this matters more than build time

Build time (15-25 min per phase) is predictable and manageable. API quota is a harder constraint:
- Each in-container Claude session consumes budget proportional to context size + tool calls
- Later phases are heavier: Phase 3 adds API integration scaffolding, Phase 5 adds Claude-from-app, Phase 6 adds Redis
- A typical Phase 1 run likely consumes ~2-5x more than a simple "say hello" probe
- 45 actions × ~4 phases each × Phase 5/6 complexity = large total consumption
- No usage metering was in place when Phase 4 was hit — the failure was silent until runtime

### Correct approach for Phase C

1. **Don't start Phase C at the start of a quota period.** Verify remaining budget first.
2. **Batch actions in quota-aware waves.** If each action consumes N% of quota, plan waves of (100/N) actions.
3. **Pre-flight the quota** before each container dispatch: refuse to start if estimated usage exceeds remaining.
4. **Hard stop before limit.** If a container exits with a 400 quota error, log and halt immediately rather than retrying (retries consume more quota).

### Correct budget math for Phase C

- 3% per action × 45 actions = **135% of one quota window** — Phase C spans at least 2 windows
- Never plan a wave that fills to exactly the wave budget — leave ≥7% slack for retry-after-failure
- Wave sizing: ≤25% of quota per sub-wave (9-10 actions), allowing one retry per wave without overflow
- Check `api-budget-check.sh` before each sub-wave start, not just once per quota window
- Run `api-budget-check.sh` standalone before action 1 of Wave 1 (first live run after a quota reset) — confirm it reports sensibly before trusting it to gate production dispatches

### Decision

Add `scripts/api-budget-check.sh` that gates action dispatch. Wire it into Phase C launch. Budget estimate: 3% per action, conservative. Plan 6 sub-waves across 2-3 quota windows (see `docs/PHASE_C_RUNBOOK.md`). Do NOT conflate `phase-A-complete` (infrastructure gate) with `phase-B-complete` (live smoke gate) — they are separate.

---

## Learning 015: Claude Code in Docker Must Authenticate via Subscription, Not API Key

**Date discovered:** 2026-05-12
**Affects:** All in-container Claude Code workflow execution (Phase B onward)
**Severity:** High — without this pattern, workflow builds silently charge the experiment Anthropic workspace

### What happened

In-container Claude Code was authenticating via `ANTHROPIC_API_KEY` sourced from `.env.local`. That key belongs to the experiment's Anthropic workspace (own spend cap), not to the operator's Claude Max subscription. Phase B used API-key auth for Phases 1-3 and hit the workspace budget cap before Phase 4, halting progress until the next billing window.

The operator's Claude Max subscription ($200/month) has independent capacity and should be the auth source for Claude Code workflow execution. The `~/.claude/` bind-mount was already present in `docker/run-claude.sh`, but Claude Code reads `ANTHROPIC_API_KEY` from the environment if present and falls back to it even when `~/.claude/` contains valid subscription session credentials.

### The fix

Strip `ANTHROPIC_API_KEY` explicitly from the claude subprocess env:

```bash
env -u ANTHROPIC_API_KEY claude --bare --dangerously-skip-permissions -p "$CLAUDE_PROMPT"
```

This leaves `ANTHROPIC_API_KEY` in the broader shell environment so app processes spawned by vitest/playwright still find it from `.env.local`. Only the `claude` process itself is stripped.

### Two distinct auth scopes (canonical pattern from v2 onward)

| Scope | Auth source | Why |
|---|---|---|
| Claude Code workflow execution (in-container) | `~/.claude/` subscription session | Subscription capacity; no per-token cost |
| Next.js app processes (Phase 3 enrichment, Phase 5 chat, Phase 6 disambiguation, e2e tests) | `ANTHROPIC_API_KEY` from `.env.local` | App features must use the API key; subscription is not an API credential |

### Regression test

`scripts/validate-container-claude-subscription.sh` asserts three things:
1. **Structural:** `docker/run-claude.sh` contains the `env -u ANTHROPIC_API_KEY claude` strip
2. **Runtime:** `.env.local` sourced (key present in shell) but absent from the subprocess env
3. **End-to-end:** a trivial prompt completes (subscription auth actually works, not just configured)

Run this before any smoke or full experiment build. `validate-container-claude.sh` passing also means subscription auth works — it no longer tests API-key auth.

### Methodology footnote (vanilla smoke run)

Phases 1-3 of the vanilla smoke run (`experiment/vanilla-r1-v2c`) were built with API-key auth. Subscription Sonnet and API-key Sonnet are the same model. Phases 4-6 used subscription auth. This is documented here as a methodology footnote, not a contamination — the independent variable (workflow methodology) is unaffected.

### Operator action required

Set the experiment Anthropic workspace's monthly cap to ~$20 in [console.anthropic.com](https://console.anthropic.com). Without this cap, any accidental future fallback to API-key auth continues to cost money silently. With a $20 cap, fallback fails loudly at the cap and the regression is caught immediately.
