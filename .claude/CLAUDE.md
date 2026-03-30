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

## Workflow Enforcement — Compound Engineering

**THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT.**

This branch uses the **Compound Engineering** framework. You MUST invoke the `/lfg` skill (the CE autonomous pipeline) for ALL build work. `/lfg` chains: ce:plan → deepen-plan → ce:work → ce:review → resolve findings → compound. Each step has GATE checks that must pass before proceeding.

**You MUST:**

- Invoke `/lfg` via the Skill tool — this is the ONLY way to start build work
- When `/lfg` invokes sub-skills (`ce-plan`, `ce-work`, `ce-review`, `deepen-plan`, `ce-compound`, `resolve-todo-parallel`, `test-browser`, `feature-video`), invoke each one via the Skill tool — ALL are registered in `.claude/commands/`
- Use the Agent tool when a skill says "run these agents in parallel" or "Task X(args)"
- Ensure ce:compound runs and produces files in `docs/solutions/` — this is CE's core differentiator

**You MUST NOT:**

- Skip `/lfg` and build the app directly
- Read `.claude/skills/*/SKILL.md` files with the Read tool instead of invoking commands via the Skill tool — all CE skills have been copied to `.claude/commands/` for this purpose
- Skip sub-agent spawning when CE skills instruct you to spawn agents
- Create a PR or push to remote (the experiment's /start command handles this)
- Skip ce:compound due to "context budget" — it must run

**Autonomous decision-making:** When any CE skill asks for user input, presents menus, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
