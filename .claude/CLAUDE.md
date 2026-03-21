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

## Workflow Enforcement — Superpowers

**THIS IS A HARD REQUIREMENT. VIOLATION INVALIDATES THE EXPERIMENT.**

This branch uses the **Superpowers** framework. You MUST follow the Superpowers workflow for ALL build work. **Use the Skill tool to invoke each command** — do NOT read skill/command files as reference text ("read and follow" degrades enforcement; see Learning 005/006).

1. **`brainstorming`** — Invoke via Skill tool: `skill: "brainstorming", args: "<description>"`
2. **`writing-plans`** — Invoke via Skill tool: `skill: "writing-plans", args: "<description>"`
3. **`subagent-driven-development`** (or `executing-plans`) — Invoke via Skill tool: `skill: "subagent-driven-development"` or `skill: "executing-plans"`
4. **`requesting-code-review`** — Invoke via Skill tool: `skill: "requesting-code-review"`
5. **`verification-before-completion`** — Invoke via Skill tool: `skill: "verification-before-completion"`
6. **`finishing-a-development-branch`** — Invoke via Skill tool: `skill: "finishing-a-development-branch"`

**You MUST NOT:**

- Skip any step in the workflow
- Write application code before completing brainstorming and writing-plans
- Skip code review or verification
- Code the solution directly without going through the workflow
- Create a git worktree (work on the current branch)
- Read skill/command files as prose instead of invoking them via the Skill tool

**TDD Iron Law:** Follow `.claude/skills/test-driven-development/SKILL.md` — write a failing test FIRST, then implement to make it pass. No production code without a failing test.

**Autonomous decision-making:** When any Superpowers skill has a HARD-GATE requiring user approval, asks for user input, or says to "raise concerns with your human partner" — make decisions yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. You ARE the user for this session. Do not stop or wait for Muxin.
