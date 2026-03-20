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

## Workflow Enforcement — Spec Kit

**THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT.**

This branch uses the **GitHub Spec Kit** framework. You MUST follow the Spec Kit workflow for ALL build work:

1. **`speckit.specify`** — Create the feature specification from the project spec. Read `.claude/commands/speckit.specify.md`.
2. **`speckit.clarify`** — Identify and resolve underspecified areas. Read `.claude/commands/speckit.clarify.md`.
3. **`speckit.plan`** — Create the technical implementation plan. Read `.claude/commands/speckit.plan.md`.
4. **`speckit.tasks`** — Generate dependency-ordered task breakdown. Read `.claude/commands/speckit.tasks.md`.
5. **`speckit.analyze`** — Run cross-artifact consistency analysis. Read `.claude/commands/speckit.analyze.md`.
6. **`speckit.implement`** — Execute all tasks from tasks.md. Read `.claude/commands/speckit.implement.md`.

**You MUST NOT:**

- Skip any step in the workflow
- Write application code before completing specify → clarify → plan → tasks
- Skip analyze or implement
- Code the solution directly without going through the workflow
- Create a new git branch (stay on the current branch)

**Autonomous decision-making:** When any Spec Kit command asks for user input, presents choices, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
