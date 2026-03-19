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

### Why this matters for the write-up

This is itself a finding worth reporting: **workflow frameworks that rely on users explicitly invoking their commands will be bypassed in autonomous AI execution contexts unless hard enforcement exists.** The fact that 4 out of 5 runs produced nearly identical results despite very different frameworks installed tells you something about the gap between "framework available" and "framework actually used." The re-run with explicit enforcement tests the complementary question: do the frameworks produce meaningfully different results when their methodologies are actually followed?
