You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Compound Engineering workflow loop** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**Pre-flight checks (automated):**

1. **Log build start:**
   Run: `mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'","model":"claude-sonnet-4-6"}' > metrics/timing.jsonl`
   Note: If you are NOT running on Sonnet 4.6, update the model field to match the actual model (e.g., `claude-opus-4-6`).

2. **Verify measurement infrastructure:**
   Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`
   If any are missing, STOP and tell the operator. Do not proceed with the build.

3. **Verify Compound Engineering framework:**
   Confirm `.claude/skills/ce-plan/SKILL.md` exists.
   If missing, STOP and tell the operator. The framework is not installed.

4. **Phase 2 only — verify starting point:**
   If this is a Phase 2 run (RUN_LOG says Phase 2):
   Run: `git describe --tags --exact-match HEAD 2>/dev/null`
   Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Compound Engineering workflow — ALL steps are MANDATORY:**

**Step B1 — Plan (`ce:plan`):**

Run: `echo '{"step":"ce:plan","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-plan/SKILL.md` with this argument:
- Phase 1: `"Build the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `"Add Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for ce:plan:
- When the skill asks you to "ask the user" or presents refinement questions: answer them yourself using `docs/PROJECT_SPEC.md` as the source of truth. Do NOT stop or wait.
- When asked about branches: stay on the current branch. Do not create a new branch.
- When offered a choice between research levels: choose "standard" (not minimal, not deep).
- Save the plan to `docs/plans/` as the skill instructs.
- When the skill completes, note the plan file path for the next step.

Run: `echo '{"step":"ce:plan","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B2 — Work (`ce:work`):**

Run: `echo '{"step":"ce:work","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-work/SKILL.md` with the plan file path from B1 as argument.

AUTONOMOUS RULES for ce:work:
- When asked about branch strategy: choose "Continue on current branch."
- When asked for clarification: make the decision yourself using the spec and plan.
- Create a TodoWrite task list from the plan and work through it systematically.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

Run: `echo '{"step":"ce:work","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B3 — Review (`ce:review`):**

Run: `echo '{"step":"ce:review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-review/SKILL.md` with argument `"current branch"`.

AUTONOMOUS RULES for ce:review:
- Review the code on the current branch (do not create a PR for this).
- When asked about execution mode: use `--serial` to conserve context.
- Fix any critical or high-severity issues found. Commit fixes.
- Log but skip cosmetic/style-only suggestions.

Run: `echo '{"step":"ce:review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B4 — Compound (`ce:compound`):**

Run: `echo '{"step":"ce:compound","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-compound/SKILL.md` with argument `"Built ballot ranking tool using Compound Engineering workflow"`.

AUTONOMOUS RULES for ce:compound:
- Choose "compact-safe mode" (option 2) to conserve context.
- Document the solution in `docs/solutions/` as the skill instructs.
- This step is about knowledge capture — do not skip it.

Run: `echo '{"step":"ce:compound","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**c) Post-build measurement:**

1. **Log build end:**
   Run: `echo '{"event":"build_end","timestamp":"'$(date -Iseconds)'"}' >> metrics/timing.jsonl`

2. **Track workflow-generated tests:**
   Run: `echo "--- Workflow-generated test files ---" && find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20 || echo "None found"`
   Note the count for the RUN_LOG entry.

3. **Git build statistics:**
   Run:
   ```
   echo '--- Git build statistics ---'
   echo "Commits since scaffold: $(git rev-list --count v0-scaffold..HEAD)"
   git diff --shortstat v0-scaffold..HEAD
   ```
   Log the commit count and lines added/removed for the RUN_LOG entry.

4. **Framework adherence verification & artifact inventory:**
   Check that the Compound Engineering workflow produced its expected artifacts:
   - `docs/plans/` must contain at least one plan file (from ce:plan)
   - `docs/solutions/` must contain at least one solution file (from ce:compound)
   - `metrics/workflow-log.jsonl` must contain completed entries for all 4 steps
   Run:
   ```
   echo '--- CE Adherence Check ---'
   echo "Plan files:" && ls docs/plans/ 2>/dev/null || echo "  NONE — ce:plan may not have run"
   echo "Solution files:" && ls docs/solutions/ 2>/dev/null || echo "  NONE — ce:compound may not have run"
   echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
   echo "Expected steps: ce:plan, ce:work, ce:review, ce:compound"
   ```
   If any expected artifacts are missing, flag it in the debrief as a **partial workflow bypass** — this is a critical finding for the experiment.

5. **Run measurement:**
   Run `npm run measure` and save the JSON report.

6. **Phase 2 delta report (Phase 2 only):**
   If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:
   For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
   `Phase 1 value → Phase 2 value (delta)`

7. **Tag and push:**
   Tag the branch (e.g., `ce-run2-phase1-complete`, `ce-run2-phase2-complete`).
   Push commits and tags to remote.

**d) Operator debrief:**

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Git build statistics: commit count, lines added/removed since scaffold
5. Framework adherence: which CE artifacts were produced, any missing steps
6. Phase 2 only: Phase 1 → Phase 2 metric deltas

Then ask: **"Build complete. Any observations for the write-up? Anything surprising about the output or metrics?"**

Record her response in the RUN_LOG entry under **Operator notes**.
If she has nothing to add, note "No additional observations" and proceed.

## Step 3: Switch back to main
- `git checkout main`

## Step 4: Update RUN_LOG
- Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, tag name, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 5: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 1. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.