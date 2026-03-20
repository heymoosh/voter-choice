You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Superpowers workflow** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**Pre-flight checks (automated):**

1. **Log build start:**
   Run: `mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'"}' > metrics/timing.jsonl`

2. **Verify measurement infrastructure:**
   Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`
   If any are missing, STOP and tell the operator. Do not proceed with the build.

3. **Verify Superpowers framework:**
   Confirm `.claude/skills/brainstorming/SKILL.md` exists.
   If missing, STOP and tell the operator. The framework is not installed.

4. **Phase 2 only — verify starting point:**
   If this is a Phase 2 run (RUN_LOG says Phase 2):
   Run: `git describe --tags --exact-match HEAD 2>/dev/null`
   Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Superpowers workflow — ALL steps are MANDATORY:**

**Step B1 — Brainstorm (`brainstorming`):**

Run: `echo '{"step":"brainstorming","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/brainstorming/SKILL.md`.

Input: Use `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the feature description.

AUTONOMOUS RULES for brainstorming:
- The skill has a HARD-GATE requiring user approval of the design. In autonomous mode: once you have explored project context and formulated 2-3 approaches, select the approach that best matches the spec and **approve it yourself**. You ARE the user for this session.
- When the skill asks clarifying questions: answer them using PROJECT_SPEC.md.
- When asked to offer a "visual companion": skip this step (no visual display available).
- Save the design doc to `docs/superpowers/specs/` as the skill instructs.
- Run the spec-document-reviewer subagent as instructed. Fix issues it finds.
- After the spec review loop completes, consider the spec approved and transition to writing-plans.

Run: `echo '{"step":"brainstorming","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B2 — Write Plan (`writing-plans`):**

Run: `echo '{"step":"writing-plans","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/writing-plans/SKILL.md`.

AUTONOMOUS RULES for writing-plans:
- Use the design doc from B1 as input.
- When the skill says to "raise concerns with your human partner": if the concern is a genuine spec conflict, note it in the plan and proceed. Do not stop.
- Save the plan to `docs/superpowers/plans/` as the skill instructs.
- Run the plan-document-reviewer subagent. Fix issues it finds.
- Do NOT create a git worktree. Work on the current branch.

Run: `echo '{"step":"writing-plans","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B3 — Execute Plan (`executing-plans` or `subagent-driven-development`):**

Run: `echo '{"step":"executing-plans","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/executing-plans/SKILL.md`. If the plan has independent tasks, prefer `.claude/skills/subagent-driven-development/SKILL.md` instead.

AUTONOMOUS RULES for executing-plans:
- Follow the TDD Iron Law from `.claude/skills/test-driven-development/SKILL.md`: write a failing test FIRST, then implement to make it pass.
- When the skill says "stop and ask for help": attempt to resolve the issue yourself. Only stop if you encounter a genuine blocker that cannot be resolved from the spec or plan.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

Run: `echo '{"step":"executing-plans","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B4 — Code Review (`requesting-code-review`):**

Run: `echo '{"step":"requesting-code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/requesting-code-review/SKILL.md`.

AUTONOMOUS RULES for requesting-code-review:
- Dispatch the code-reviewer agent on the current branch.
- Fix critical and high-severity issues. Log but skip cosmetic suggestions.
- Commit fixes.

Run: `echo '{"step":"requesting-code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B5 — Verify (`verification-before-completion`):**

Run: `echo '{"step":"verification-before-completion","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/verification-before-completion/SKILL.md`.

AUTONOMOUS RULES for verification:
- Run ALL verification commands (tests, lint, build).
- Fix any failures. Do not claim completion until everything passes.

Run: `echo '{"step":"verification-before-completion","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step B6 — Finish (`finishing-a-development-branch`):**

Run: `echo '{"step":"finishing-a-development-branch","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/finishing-a-development-branch/SKILL.md`.

AUTONOMOUS RULES for finishing:
- Do NOT merge to main. Do NOT create a PR. Choose "leave on branch" option.
- The experiment measures the branch in its current state.

Run: `echo '{"step":"finishing-a-development-branch","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**c) Post-build measurement:**

1. **Log build end:**
   Run: `echo '{"event":"build_end","timestamp":"'$(date -Iseconds)'"}' >> metrics/timing.jsonl`

2. **Track workflow-generated tests:**
   Run: `echo "--- Workflow-generated test files ---" && find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20 || echo "None found"`
   Note the count for the RUN_LOG entry.

3. **Run measurement:**
   Run `npm run measure` and save the JSON report.

4. **Phase 2 delta report (Phase 2 only):**
   If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:
   For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
   `Phase 1 value → Phase 2 value (delta)`

5. **Tag and push:**
   Tag the branch (e.g., `superpowers-run2-phase1-complete`, `superpowers-run2-phase2-complete`).
   Push commits and tags to remote.

**d) Operator debrief:**

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Phase 2 only: Phase 1 → Phase 2 metric deltas

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
