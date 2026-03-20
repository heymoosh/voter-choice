# CLAUDE.md

## Project
Workflow experiment comparing 5 AI coding frameworks. Read `docs/RUN_LOG.md` first (the `## Next` line), then `docs/EXPERIMENT_DESIGN.md` Session Quick Start. Immediately execute the sub-phase described in `## Next` — do NOT pause or wait for confirmation. Do ONE sub-phase per session.

**After completing a sub-phase, you MUST update `docs/RUN_LOG.md` before doing anything else:**
1. Move the completed phase from `## Next` into `## Completed` (include commit hash and brief summary).
2. Write the new next phase into `## Next`.
3. Commit the RUN_LOG update. The session is NOT complete until RUN_LOG reflects the new state.


## Boundaries
- **Repo only.** Never read/write/delete anything outside `/Users/Muxin/Documents/GitHub/voter-choice`
- **No sudo.** No global installs (`npm -g`, system pip). Local `npm install` is fine; pip must use a venv
- **No force push, no branch deletion, no history rewriting** (rebase, reset --hard, amend pushed commits). Branches and tags are experiment data.
- **Commit before switching branches.** Pull before pushing.
- **No privileged Docker containers.** Bind ports to 127.0.0.1 only.
- **`rm -rf` only on build artifacts** (node_modules, .next, coverage, dist) with exact paths. State what you're deleting before running.
- Pin exact versions in package.json. Meaningful commit messages: `phase0.1: write feature spec`
- If anything requires going outside these boundaries, **stop and ask Muxin.**

## Code Style
TypeScript. ESLint + Prettier (configured in Phase 0.3a as part of scaffold setup).

## Workflow Enforcement — Compound Engineering

**THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT.**

This branch uses the **Compound Engineering** framework. You MUST follow the CE workflow loop for ALL build work:

1. **`ce:plan`** — Create a structured plan BEFORE writing any application code. Read and follow `.claude/skills/ce-plan/SKILL.md`.
2. **`ce:work`** — Execute the plan systematically. Read and follow `.claude/skills/ce-work/SKILL.md`.
3. **`ce:review`** — Review the completed code using multi-agent analysis. Read and follow `.claude/skills/ce-review/SKILL.md`.
4. **`ce:compound`** — Document the solution for knowledge compounding. Read and follow `.claude/skills/ce-compound/SKILL.md`.

**You MUST NOT:**

- Skip any step in the workflow loop
- Write application code before completing ce:plan
- Skip ce:review or ce:compound after building
- Code the solution directly without going through the workflow

**Autonomous decision-making:** When any CE skill asks for user input, presents menus, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
