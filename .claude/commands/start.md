You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Compound Engineering workflow loop** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Compound Engineering workflow — ALL steps are MANDATORY:**

**Step B1 — Plan (`ce:plan`):**
Read and follow `.claude/skills/ce-plan/SKILL.md` with this argument:
- Phase 1: `"Build the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `"Add Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for ce:plan:
- When the skill asks you to "ask the user" or presents refinement questions: answer them yourself using `docs/PROJECT_SPEC.md` as the source of truth. Do NOT stop or wait.
- When asked about branches: stay on the current branch. Do not create a new branch.
- When offered a choice between research levels: choose "standard" (not minimal, not deep).
- Save the plan to `docs/plans/` as the skill instructs.
- When the skill completes, note the plan file path for the next step.

**Step B2 — Work (`ce:work`):**
Read and follow `.claude/skills/ce-work/SKILL.md` with the plan file path from B1 as argument.

AUTONOMOUS RULES for ce:work:
- When asked about branch strategy: choose "Continue on current branch."
- When asked for clarification: make the decision yourself using the spec and plan.
- Create a TodoWrite task list from the plan and work through it systematically.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

**Step B3 — Review (`ce:review`):**
Read and follow `.claude/skills/ce-review/SKILL.md` with argument `"current branch"`.

AUTONOMOUS RULES for ce:review:
- Review the code on the current branch (do not create a PR for this).
- When asked about execution mode: use `--serial` to conserve context.
- Fix any critical or high-severity issues found. Commit fixes.
- Log but skip cosmetic/style-only suggestions.

**Step B4 — Compound (`ce:compound`):**
Read and follow `.claude/skills/ce-compound/SKILL.md` with argument `"Built ballot ranking tool using Compound Engineering workflow"`.

AUTONOMOUS RULES for ce:compound:
- Choose "compact-safe mode" (option 2) to conserve context.
- Document the solution in `docs/solutions/` as the skill instructs.
- This step is about knowledge capture — do not skip it.

**c) Post-build measurement:**
- Run `npm run measure` and save the JSON report.
- Tag the branch (e.g., `ce-phase1-complete`, `ce-phase2-complete`).
- Push commits and tags to remote.

**d) Remind operator:**
- Tell Muxin to fill out `docs/QUALITATIVE_SCORECARD.md`.
- Report key metrics from the measurement JSON.

## Step 3: Switch back to main
- `git checkout main`

## Step 4: Update RUN_LOG
- Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, tag name, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 5: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 1. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.