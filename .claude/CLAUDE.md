# CLAUDE.md

## Project
Workflow experiment comparing 5 AI coding frameworks (vanilla, BMAD, Compound Engineering, Spec Kit, Superpowers).

**To run the experiment:** invoke `/start`. It auto-detects from git tags + metric files what's done and what's pending, then orchestrates the next action across all 45 actions in the experiment (15 Phase 1 replicates + 5 representative selections + 25 forward-iteration phases — Phases 2–6). It loops within the session and exits when the experiment is complete OR when context degrades. Re-invoke `/start` to resume.

**For fully hands-off operation:** `/loop /start` will re-invoke `/start` automatically until it reports "EXPERIMENT COMPLETE."

**State lives on disk, not in `## Next`:**
- Git tags drive completion detection: `<framework>-r<N>-phase1-complete`, `<framework>-phase<N>-complete`
- `metrics/experiment/<framework>-representative.json` marks selection done
- `docs/RUN_LOG.md ## Next` is for human reading only; the orchestrator doesn't depend on it.


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
