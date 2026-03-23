# CLAUDE.md

## Project
Workflow experiment comparing 5 AI coding frameworks. Read `docs/RUN_LOG.md` first (the `## Next` line), then `docs/EXPERIMENT_DESIGN.md` Session Quick Start. Immediately execute the sub-phase described in `## Next` — do NOT pause or wait for confirmation. Do ONE sub-phase per session.

**After completing a sub-phase, you MUST update `docs/RUN_LOG.md` on the `main` branch before doing anything else:**
1. Switch to `main` (commit any pending work on the current branch first).
2. Move the completed phase from `## Next` into `## Completed` (include commit hash and brief summary).
3. Write the new next phase into `## Next`.
4. Commit the RUN_LOG update and switch back to the working branch. The session is NOT complete until `main`'s RUN_LOG reflects the new state.

**Note:** Branch-local copies of `docs/RUN_LOG.md` are git artifacts from fork points — do NOT update them. Only `main`'s copy is canonical.


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

This branch uses the **BMAD Method** framework. You MUST follow the BMAD workflow for ALL build work. **Use the Skill tool to invoke each command** — do NOT read skill/command files as reference text ("read and follow" degrades enforcement; see Learning 005/006).

**Step 0 — Brainstorming:**

0. **`bmad-brainstorming`** — Invoke via Skill tool: `skill: "bmad-brainstorming", args: "<description>"`

**Phase 1 — Analysis:**

1. **`bmad-create-product-brief`** — Invoke via Skill tool: `skill: "bmad-create-product-brief", args: "<description>"`

**Phase 2 — Planning:**

2. **`bmad-create-prd`** — Invoke via Skill tool: `skill: "bmad-create-prd", args: "<description>"`
3. **`bmad-create-ux-design`** — Invoke via Skill tool: `skill: "bmad-create-ux-design", args: "<description>"`

**Phase 3 — Solutioning:**

4. **`bmad-create-architecture`** — Invoke via Skill tool: `skill: "bmad-create-architecture", args: "<description>"`
5. **`bmad-create-epics-and-stories`** — Invoke via Skill tool: `skill: "bmad-create-epics-and-stories", args: "<description>"`
6. **`bmad-check-implementation-readiness`** — Invoke via Skill tool: `skill: "bmad-check-implementation-readiness", args: "<description>"`

**Phase 4 — Implementation:**

7. **`bmad-sprint-planning`** — Invoke via Skill tool: `skill: "bmad-sprint-planning", args: "<description>"`
8. **`bmad-create-story`** + **`bmad-dev-story`** — Invoke via Skill tool for each story in sequence.
9. **`bmad-code-review`** — Invoke via Skill tool: `skill: "bmad-code-review", args: "<description>"`

**You MUST NOT:**

- Skip any phase in the workflow
- Write application code before completing Analysis, Planning, and Solutioning
- Skip implementation readiness check
- Code the solution directly without going through the BMAD phases
- **Read skill/command files as prose instead of invoking them via the Skill tool** — "Read and follow" degrades enforcement (see Learning 005/006). Every BMAD step MUST be invoked using the Skill tool (`skill: "bmad-X"`), not by reading SKILL.md files with the Read tool.

**Autonomous decision-making:** When any BMAD workflow step asks for user input, presents menus, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
