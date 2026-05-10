You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context

- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):

Execute the sub-phase directly. Create files, write code, make commits. Do the actual work NOW. Skip to Step 5.

### If Phase 1 or Phase 2 (build / extend):

This is a full workflow run. Execute the following lifecycle:

**a) Branch & clean environment:**

- Identify the correct workflow branch from the run order in RUN_LOG.
- `git checkout <branch>`
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Load the workflow's own configuration:**

- Read `.claude/CLAUDE.md` on this branch for any workflow-specific instructions.
- If the workflow has its own slash commands or skills (e.g., `/speckit.specify`, `/ce:plan`), use them as the workflow intends — but do NOT stop to ask the operator for input. Proceed with reasonable defaults for any decisions.

**c) Build autonomously:**

- Build the ballot tool per `docs/PROJECT_SPEC.md` (Phase 1) or add Spanish support per `docs/PHASE2_SPEC.md` (Phase 2).
- Use the spec as the source of truth for all decisions. Do not ask clarifying questions — proceed with your best judgment.
- If the workflow plugin asks you to present menus, make choices, or wait for user input: make the choice yourself using the spec and move on.
- Commit regularly with meaningful messages.

**d) Post-build measurement:**

- Run `npm run measure` and save the JSON report.
- Tag the branch (e.g., `vanilla-phase1-complete`, `compound-engineering-phase2-complete`).
- Push commits and tags to remote.

**e) Remind operator:**

- Tell Muxin to fill out the post-run qualitative scorecard in `docs/QUALITATIVE_SCORECARD.md`.
- Report the key metrics from the measurement JSON (Lighthouse scores, e2e pass rate, ESLint errors, duplication %, LOC).

## Step 3: Switch back to main

- `git checkout main`

## Step 4: Update RUN_LOG

- Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, tag name, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 5: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 1. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.
