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

This branch uses the **Compound Engineering** framework. You MUST invoke the `/lfg` skill (the CE autonomous pipeline) for ALL build work. `/lfg` chains: ce:plan → deepen-plan → ce:work → ce:review → resolve findings → compound. Each step has GATE checks that must pass before proceeding.

**You MUST:**

- Invoke `/lfg` via the Skill tool — this is the ONLY way to start build work
- When `/lfg` invokes sub-skills (`/ce:plan`, `/ce:work`, etc.), follow their instructions exactly — including spawning sub-agents when the skill says to spawn agents
- Use the Agent tool when a skill says "run these agents in parallel" or "Task X(args)"

**You MUST NOT:**

- Skip `/lfg` and build the app directly
- Manually read SKILL.md files instead of invoking skills via the Skill tool
- Skip sub-agent spawning when CE skills instruct you to spawn agents
- Create a PR or push to remote (the experiment's /start command handles this)

**Autonomous decision-making:** When any CE skill asks for user input, presents menus, or asks clarifying questions — answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do not stop or wait for Muxin.
