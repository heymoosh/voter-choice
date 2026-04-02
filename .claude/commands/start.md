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

## Step 2: Route and checkout

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly on main. Create files, write code, make commits. Do the actual work NOW. Skip to **Step 7**.

### If Phase 1 or Phase 2 (build / extend):
YOU must checkout the target branch NOW. Do NOT tell the operator to do this. Do NOT stop. Run this command yourself:

```bash
git checkout <branch-name>
```

(Use the branch name you parsed from `## Next` in Step 1.)

If the checkout fails (uncommitted changes, branch not found), STOP and report the error. Do not proceed. Otherwise, continue to Step 3.

## Step 3: Pre-flight checks

**3a. Log build start:**

Identify what model you are running as. Your model name is in your system context (e.g., `claude-opus-4-6`, `claude-sonnet-4-6`). Log it:

```
mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'","model":"<YOUR_MODEL_ID>"}' > metrics/timing.jsonl
```

Replace `<YOUR_MODEL_ID>` with your actual model identifier. Do NOT hardcode a guess.

**3b. Verify measurement infrastructure:**

Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`

If any are missing, STOP and tell the operator. Do not proceed with the build.

**3c. Verify framework workflow file:**

Confirm `.claude/commands/workflow.md` exists on this branch.

If missing, STOP and tell the operator: "This branch has no workflow.md. The framework workflow steps are missing."

**3d. Phase 2 only — verify starting point:**

If this is a Phase 2 run (RUN_LOG says Phase 2):

Run: `git describe --tags --exact-match HEAD 2>/dev/null`

Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

## Step 4: Clean environment

```
rm -rf node_modules .next coverage playwright-report.json
npm install
```

## Step 5: Execute framework workflow

**Build context:**
- **Phase 1:** This branch has the framework and scaffold installed but NO existing ballot tool code. You are building the app from scratch per `docs/PROJECT_SPEC.md`.
- **Phase 2:** This branch has a completed Phase 1 ballot tool. You are extending it with Spanish language support per `docs/PHASE2_SPEC.md`.

Read `.claude/commands/workflow.md` from the current branch. It contains the framework-specific workflow steps.

**Execute every instruction in that file completely before returning to Step 6 below.**

The workflow.md file contains:
- A `## Meta` section with framework name, tag prefix, and framework verification path
- A `## Workflow Steps` section — the core framework methodology to follow
- An `## Adherence Check` section — verification commands to run after the build

Execute the `## Workflow Steps` section now. You will execute the `## Adherence Check` section in Step 6.

## Step 6: Post-build measurement

**6a. Log build end:**

```
echo '{"event":"build_end","timestamp":"'$(date -Iseconds)'"}' >> metrics/timing.jsonl
```

**6b. Track workflow-generated tests:**

```
echo "--- Workflow-generated test files ---"
find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20 || echo "None found"
```

Note the count for the RUN_LOG entry.

**6c. Git build statistics:**

```
echo '--- Git build statistics ---'
echo "Commits since scaffold: $(git rev-list --count v0-scaffold..HEAD)"
git diff --shortstat v0-scaffold..HEAD
```

Log the commit count and lines added/removed for the RUN_LOG entry.

**6d. Framework adherence verification:**

Read the `## Adherence Check` section of `.claude/commands/workflow.md` and execute those verification commands now.

If any expected artifacts are missing, flag it in the debrief as a **partial workflow bypass** — this is a critical finding for the experiment.

**6e. Run measurement:**

Run `npm run measure` and save the JSON report.

**6f. Adherence analysis + auto-findings:**

Run the adherence analysis script against the current branch:

```bash
node scripts/analyze-adherence.mjs
```

This produces `metrics/adherence/<branch>.json` with TDD compliance, workflow log completeness, build statistics, timing validation, and measurement JSON completeness. Git add the report: `git add metrics/adherence/`.

Then read the adherence report JSON and the measurement JSON, and run EVERY check below. This is a checklist, not a suggestion — evaluate each item and record the result (PASS/FINDING).

| # | Check | Condition that triggers a FINDING | What to record |
|---|-------|----------------------------------|----------------|
| 1 | **E2e gap** | `e2ePassed` < `e2eTotal` or `e2eTotal` < 42 | Pass count, total count, whether failures are new or pre-existing |
| 2 | **TDD violation** | `tddScore` < 100 OR `implOnlyCommits` > 0 | TDD score, impl-only commit count, neutral count |
| 3 | **TDD unassessable** | `tddScore` is null AND `uniqueTestFiles` > 0 | Count of neutral vs unchecked, explain why score is null |
| 4 | **Workflow gap** | `workflowLog.missing` array has entries | Which steps are missing |
| 5 | **Lint regression** | `eslintErrors` > 0 OR `eslintWarnings` > 0 | Error and warning counts |
| 6 | **Bundle anomaly** | First load JS > 130 kB or < 85 kB (±20% from ~102 kB baseline) | Actual bundle size |
| 7 | **Timing gap** | `timing.hasStart` or `timing.hasEnd` is false | Which entry is missing |
| 8 | **Measurement gap** | `measurement.missing` array has entries | Which fields are missing from JSON |
| 9 | **Workflow log empty** | `workflow-log.jsonl` missing or 0 completed entries | Whether file exists, entry count |
| 10 | **Test generation** | `uniqueTestFiles` == 0 for a non-vanilla framework | Framework name, expected behavior |

Write these findings into the RUN_LOG entry in Step 9 under a **Findings** subsection. Format each finding as:
- **Finding name (UNIQUE TO <BRANCH> if applicable):** description with specific numbers

If ALL checks pass, write: "No anomalies detected — all 10 checks passed, metrics within expected ranges."

**6f-gate. Data completeness gate (MUST PASS before proceeding):**

Before continuing, verify that all required data artifacts were captured. Run each check and flag any failures. If any check fails, investigate and fix before proceeding — do NOT skip to tagging.

```bash
echo "=== DATA COMPLETENESS GATE ==="
echo ""

# 1. timing.jsonl — must have both build_start and build_end
echo "--- timing.jsonl ---"
if [ -f metrics/timing.jsonl ]; then
  HAS_START=$(grep -c '"build_start"' metrics/timing.jsonl || true)
  HAS_END=$(grep -c '"build_end"' metrics/timing.jsonl || true)
  if [ "$HAS_START" -ge 1 ] && [ "$HAS_END" -ge 1 ]; then
    echo "PASS: build_start ($HAS_START) and build_end ($HAS_END) entries present"
    # Show duration
    START_TS=$(grep '"build_start"' metrics/timing.jsonl | head -1 | sed 's/.*"timestamp":"\([^"]*\)".*/\1/')
    END_TS=$(grep '"build_end"' metrics/timing.jsonl | tail -1 | sed 's/.*"timestamp":"\([^"]*\)".*/\1/')
    echo "  Start: $START_TS"
    echo "  End:   $END_TS"
  else
    echo "FAIL: missing build_start ($HAS_START) or build_end ($HAS_END)"
  fi
else
  echo "FAIL: metrics/timing.jsonl not found"
fi

echo ""

# 2. workflow-log.jsonl — must exist and have at least one completed entry
echo "--- workflow-log.jsonl ---"
if [ -f metrics/workflow-log.jsonl ]; then
  TOTAL=$(wc -l < metrics/workflow-log.jsonl | tr -d ' ')
  COMPLETED=$(grep -c '"completed"' metrics/workflow-log.jsonl || true)
  echo "PASS: $TOTAL entries total, $COMPLETED completed"
  if [ "$COMPLETED" -eq 0 ]; then
    echo "WARNING: zero completed entries — workflow steps may not have logged properly"
  fi
else
  echo "FAIL: metrics/workflow-log.jsonl not found — no workflow execution audit trail"
fi

echo ""

# 3. Adherence report — must exist
echo "--- adherence report ---"
BRANCH=$(git branch --show-current)
SAFE_BRANCH=$(echo "$BRANCH" | tr '/' '-')
if [ -f "metrics/adherence/${SAFE_BRANCH}.json" ]; then
  echo "PASS: metrics/adherence/${SAFE_BRANCH}.json exists"
else
  echo "FAIL: adherence report not generated"
fi

echo ""

# 4. Measurement JSON — check for latest report
echo "--- measurement JSON ---"
LATEST_MEASURE=$(ls -t metrics/*.json 2>/dev/null | head -1)
if [ -n "$LATEST_MEASURE" ]; then
  echo "PASS: $LATEST_MEASURE exists"
  # Verify required fields
  for FIELD in eslintErrors eslintWarnings e2eTotal e2ePassed; do
    if grep -q "\"$FIELD\"" "$LATEST_MEASURE"; then
      echo "  $FIELD: present"
    else
      echo "  WARNING: $FIELD not found in measurement JSON"
    fi
  done
else
  echo "FAIL: no measurement JSON found in metrics/"
fi

echo ""

# 5. Test files exist (at least for non-vanilla)
echo "--- workflow-generated tests ---"
TEST_COUNT=$(find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l | tr -d ' ')
echo "Test files in src/: $TEST_COUNT"
if [ "$TEST_COUNT" -eq 0 ]; then
  echo "WARNING: zero test files — if this framework should produce tests, this is a finding"
fi

echo ""
echo "=== END DATA COMPLETENESS GATE ==="
```

If any check shows FAIL, investigate immediately. Do NOT proceed to tagging with missing data — the experiment loses that data permanently once the session ends.

**6h. Phase 2 delta report (Phase 2 only):**

If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:

For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
`Phase 1 value -> Phase 2 value (delta)`

**6i. Tag and push:**

Read the `TAG_PREFIX` from the `## Meta` section of `.claude/commands/workflow.md`.

Extract the run number from the branch name prefix (e.g., `run2/compound-engineering` → `run2`). If the branch has no `run<N>/` prefix (e.g., `workflow/vanilla`), omit the run segment from the tag.

Tag the branch: `<TAG_PREFIX>-<RUN>-phase<N>-complete` (e.g., `ce-run2-phase1-complete`, `bmad-run2-phase2-complete`).

Push commits and tags to remote:

```bash
git push && git push --tags
```

## Step 7: Operator debrief

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Git build statistics: commit count, lines added/removed since scaffold
5. Framework adherence: which artifacts were produced, any missing steps
6. **Auto-findings summary:** list every FINDING from the 10-check table in Step 6f, or "All 10 checks passed"
7. **Data completeness gate:** PASS or list any FAILs from Step 6f-gate
8. Phase 2 only: Phase 1 -> Phase 2 metric deltas

Then ask: **"Build complete. Any observations for the write-up? Anything surprising about the output or metrics?"**

Record her response in the RUN_LOG entry under **Operator notes**.
If she has nothing to add, note "No additional observations" and proceed.

## Step 8: Switch back to main

Run: `git checkout main`

## Step 9: Update RUN_LOG

Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, tag name, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 10: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 0. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.
