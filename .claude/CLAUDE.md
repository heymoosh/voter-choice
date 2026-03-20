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

## Workflow Enforcement — BMAD Method

**THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT.**

This branch uses the **BMAD Method** framework. You MUST follow the BMAD 4-phase workflow for ALL build work:

**Phase 1 — Analysis:**

1. **`bmad-create-product-brief`** — Create product brief through collaborative discovery. Loads `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`.

**Phase 2 — Planning:**

2. **`bmad-create-prd`** — Create PRD from the product brief. Loads `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`.

**Phase 3 — Solutioning:**

3. **`bmad-create-architecture`** — Create architecture design. Loads `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`.
4. **`bmad-create-epics-and-stories`** — Break into epics and stories. Loads `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`.
5. **`bmad-check-implementation-readiness`** — Validate all artifacts. Loads `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`.

**Phase 4 — Implementation:**

6. **`bmad-sprint-planning`** — Generate sprint plan. Loads `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.md`.
7. **`bmad-create-story`** + **`bmad-dev-story`** — Create and implement each story. Loads `_bmad/bmm/workflows/4-implementation/create-story/workflow.md` and `_bmad/bmm/workflows/4-implementation/dev-story/workflow.md`.
8. **`bmad-code-review`** — Review completed code. Loads `_bmad/bmm/workflows/4-implementation/code-review/workflow.md`.

**You MUST NOT:**

- Skip any phase in the workflow
- Write application code before completing Analysis, Planning, and Solutioning
- Skip implementation readiness check
- Code the solution directly without going through the BMAD phases

**Autonomous decision-making:** When any BMAD workflow step asks for user input, presents menus, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
