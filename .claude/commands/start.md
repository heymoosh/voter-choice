You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Spec Kit workflow** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**Pre-flight checks (automated):**

1. **Log build start:**
   Run: `mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'"}' > metrics/timing.jsonl`

2. **Verify measurement infrastructure:**
   Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`
   If any are missing, STOP and tell the operator. Do not proceed with the build.

3. **Verify Spec Kit framework:**
   Confirm `.claude/commands/speckit.specify.md` exists.
   If missing, STOP and tell the operator. The framework is not installed.

4. **Phase 2 only — verify starting point:**
   If this is a Phase 2 run (RUN_LOG says Phase 2):
   Run: `git describe --tags --exact-match HEAD 2>/dev/null`
   Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Spec Kit workflow — ALL steps are MANDATORY:**

**Step B1 — Specify (`speckit.specify`):**
Read and follow `.claude/commands/speckit.specify.md` with this argument:
- Phase 1: `"Build the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `"Add Spanish language support per docs/PHASE2_SPEC.md"`

Run: `echo '{"step":"speckit.specify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.specify:
- When the command wants to create a feature branch: do NOT create a new branch. Stay on the current branch. Create the `.specify/features/` directory structure as the command requires, but skip `git checkout -b`.
- When asked to generate a short name: generate one yourself (e.g., `ballot-ranking-tool`).
- Read `docs/PROJECT_SPEC.md` to inform all spec decisions.
- Save the spec.md file in the feature directory as instructed.

Run: `echo '{"step":"speckit.specify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B2 — Clarify (`speckit.clarify`):**
Read and follow `.claude/commands/speckit.clarify.md`.

Run: `echo '{"step":"speckit.clarify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.clarify:
- This command asks up to 5 clarification questions about the spec. Answer ALL questions yourself using `docs/PROJECT_SPEC.md` as the source of truth.
- Encode answers back into spec.md as the command instructs.
- Do NOT stop or wait for user input.

Run: `echo '{"step":"speckit.clarify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B3 — Plan (`speckit.plan`):**
Read and follow `.claude/commands/speckit.plan.md`.

Run: `echo '{"step":"speckit.plan","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.plan:
- Generate the technical implementation plan using the spec.
- When asked for technology choices: use Next.js, TypeScript, Tailwind CSS as specified in the scaffold.
- Save plan.md as instructed.

Run: `echo '{"step":"speckit.plan","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B4 — Tasks (`speckit.tasks`):**
Read and follow `.claude/commands/speckit.tasks.md`.

Run: `echo '{"step":"speckit.tasks","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.tasks:
- Generate the dependency-ordered task breakdown from plan.md.
- Save tasks.md as instructed.

Run: `echo '{"step":"speckit.tasks","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B5 — Analyze (`speckit.analyze`):**
Read and follow `.claude/commands/speckit.analyze.md`.

Run: `echo '{"step":"speckit.analyze","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.analyze:
- Run the cross-artifact consistency analysis.
- Fix any inconsistencies found between spec.md, plan.md, and tasks.md.

Run: `echo '{"step":"speckit.analyze","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B6 — Implement (`speckit.implement`):**
Read and follow `.claude/commands/speckit.implement.md`.

Run: `echo '{"step":"speckit.implement","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

AUTONOMOUS RULES for speckit.implement:
- Execute ALL tasks from tasks.md sequentially.
- When asked about incomplete checklists: proceed with implementation (answer "yes").
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.
- Do NOT stop or wait for user input at any point.

Run: `echo '{"step":"speckit.implement","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

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
   Check that the Spec Kit workflow produced its expected artifacts:
   - `.specify/features/` must contain a feature directory with `spec.md` (from speckit.specify)
   - Feature directory must contain `plan.md` (from speckit.plan) and `tasks.md` (from speckit.tasks)
   - `metrics/workflow-log.jsonl` must contain completed entries for all 6 steps
   Run:
   ```
   echo '--- Spec Kit Adherence Check ---'
   echo "Feature directories:" && ls .specify/features/ 2>/dev/null || echo "  NONE — speckit.specify may not have run"
   echo "Spec files:" && find .specify/features -name "spec.md" 2>/dev/null || echo "  NONE"
   echo "Plan files:" && find .specify/features -name "plan.md" 2>/dev/null || echo "  NONE"
   echo "Task files:" && find .specify/features -name "tasks.md" 2>/dev/null || echo "  NONE"
   echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
   echo "Expected steps: speckit.specify, speckit.clarify, speckit.plan, speckit.tasks, speckit.analyze, speckit.implement"
   ```
   If any expected artifacts are missing, flag it in the debrief as a **partial workflow bypass** — this is a critical finding for the experiment.

5. **Run measurement:**
   Run `npm run measure` and save the JSON report.

6. **Phase 2 delta report (Phase 2 only):**
   If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:
   For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
   `Phase 1 value → Phase 2 value (delta)`

7. **Tag and push:**
   Tag the branch (e.g., `speckit-run2-phase1-complete`, `speckit-run2-phase2-complete`).
   Push commits and tags to remote.

**d) Operator debrief:**

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Git build statistics: commit count, lines added/removed since scaffold
5. Framework adherence: which Spec Kit artifacts were produced, any missing steps
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
