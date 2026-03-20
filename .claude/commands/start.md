You are an autonomous agent. Your job is to execute work, not describe it.

## Step 0: Ensure you are on main

Run: `git rev-parse --abbrev-ref HEAD`

If the current branch is NOT `main`:
1. Check for uncommitted changes: `git status --porcelain`
2. If there are uncommitted changes, STOP and tell the operator: "You have uncommitted changes on `<branch>`. Commit or stash them before running /start."
3. If clean, run: `git checkout main && git pull`

If already on `main`, run `git pull` to ensure you have the latest RUN_LOG.

## Step 1: Read context and determine what to do

**Key terms (do not confuse these):**
- **Phase** = experiment phase. Phase 1 = build from scratch. Phase 2 = extend with Spanish. Phase 0/3 = setup/analysis.
- **Run** = iteration number. Run 1 = original (invalidated) runs on `workflow/` branches. Run 2 = re-runs with enforcement on `run2/` branches.
- "Phase 1 Re-Run" or "Run 2" means **Phase 1** (building from scratch). "Run 2" is NOT Phase 2.

**Parse the `## Next` section:**
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Determine the **phase type** (Phase 0, 1, 2, or 3) from the text. Look for the words "Phase 1" or "Phase 2" — ignore "Run" numbers.
- If Phase 1 or 2: extract the **branch name** from the `## Next` text. It will be in backticks (e.g., `run2/compound-engineering`).

## Step 2: Route by phase type

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly on main. Create files, write code, make commits. Do the actual work NOW. Skip to **Step 8**.

### If Phase 1 or Phase 2 (build / extend):
Continue to Step 3.

## Step 3: Auto-checkout the target branch

Run: `git checkout <branch-name>` (the branch parsed from Step 1).

If the checkout fails (uncommitted changes, branch not found), STOP and report the error. Do not proceed.

## Step 4: Pre-flight checks

**4a. Log build start:**

Identify what model you are running as. Your model name is in your system context (e.g., `claude-opus-4-6`, `claude-sonnet-4-6`). Log it:

```
mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'","model":"<YOUR_MODEL_ID>"}' > metrics/timing.jsonl
```

Replace `<YOUR_MODEL_ID>` with your actual model identifier. Do NOT hardcode a guess.

**4b. Verify measurement infrastructure:**

Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`

If any are missing, STOP and tell the operator. Do not proceed with the build.

**4c. Verify framework workflow file:**

Confirm `.claude/commands/workflow.md` exists on this branch.

If missing, STOP and tell the operator: "This branch has no workflow.md. The framework workflow steps are missing."

**4d. Phase 2 only — verify starting point:**

If this is a Phase 2 run (RUN_LOG says Phase 2):

Run: `git describe --tags --exact-match HEAD 2>/dev/null`

Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

## Step 5: Clean environment

```
rm -rf node_modules .next coverage playwright-report.json
npm install
```

## Step 6: Execute framework workflow

**Build context:**
- **Phase 1:** This branch has the framework and scaffold installed but NO existing ballot tool code. You are building the app from scratch per `docs/PROJECT_SPEC.md`.
- **Phase 2:** This branch has a completed Phase 1 ballot tool. You are extending it with Spanish language support per `docs/PHASE2_SPEC.md`.

Read `.claude/commands/workflow.md` from the current branch. It contains the framework-specific workflow steps.

**Execute every instruction in that file completely before returning to Step 7 below.**

The workflow.md file contains:
- A `## Meta` section with framework name, tag prefix, and framework verification path
- A `## Workflow Steps` section — the core framework methodology to follow
- An `## Adherence Check` section — verification commands to run after the build

Execute the `## Workflow Steps` section now. You will execute the `## Adherence Check` section in Step 7.

## Step 7: Post-build measurement

**7a. Log build end:**

```
echo '{"event":"build_end","timestamp":"'$(date -Iseconds)'"}' >> metrics/timing.jsonl
```

**7b. Track workflow-generated tests:**

```
echo "--- Workflow-generated test files ---"
find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20 || echo "None found"
```

Note the count for the RUN_LOG entry.

**7c. Git build statistics:**

```
echo '--- Git build statistics ---'
echo "Commits since scaffold: $(git rev-list --count v0-scaffold..HEAD)"
git diff --shortstat v0-scaffold..HEAD
```

Log the commit count and lines added/removed for the RUN_LOG entry.

**7d. Framework adherence verification:**

Read the `## Adherence Check` section of `.claude/commands/workflow.md` and execute those verification commands now.

If any expected artifacts are missing, flag it in the debrief as a **partial workflow bypass** — this is a critical finding for the experiment.

**7e. Run measurement:**

Run `npm run measure` and save the JSON report.

**7f. Phase 2 delta report (Phase 2 only):**

If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:

For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
`Phase 1 value -> Phase 2 value (delta)`

**7g. Tag and push:**

Read the `TAG_PREFIX` from the `## Meta` section of `.claude/commands/workflow.md`.

Extract the run number from the branch name prefix (e.g., `run2/compound-engineering` → `run2`). If the branch has no `run<N>/` prefix (e.g., `workflow/vanilla`), omit the run segment from the tag.

Tag the branch: `<TAG_PREFIX>-<RUN>-phase<N>-complete` (e.g., `ce-run2-phase1-complete`, `bmad-run2-phase2-complete`).

Push commits and tags to remote:

```bash
git push && git push --tags
```

## Step 8: Operator debrief

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Git build statistics: commit count, lines added/removed since scaffold
5. Framework adherence: which artifacts were produced, any missing steps
6. Phase 2 only: Phase 1 -> Phase 2 metric deltas

Then ask: **"Build complete. Any observations for the write-up? Anything surprising about the output or metrics?"**

Record her response in the RUN_LOG entry under **Operator notes**.
If she has nothing to add, note "No additional observations" and proceed.

## Step 9: Switch back to main

Run: `git checkout main`

## Step 10: Update RUN_LOG

Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, tag name, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 11: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 0. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.
