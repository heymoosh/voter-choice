You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **BMAD Method 4-phase workflow** described below. Do NOT skip any phase. Do NOT code the solution directly without going through these phases.

**Pre-flight checks (automated):**

1. **Log build start:**
   Run: `mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'","model":"claude-sonnet-4-6"}' > metrics/timing.jsonl`
   Note: If you are NOT running on Sonnet 4.6, update the model field to match the actual model (e.g., `claude-opus-4-6`).

2. **Verify measurement infrastructure:**
   Confirm these files exist: `scripts/measure.mjs`, `e2e/ballot-tool.spec.ts`, `src/data/states/TX.json`
   If any are missing, STOP and tell the operator. Do not proceed with the build.

3. **Verify BMAD framework:**
   Confirm `_bmad/` directory exists and `.claude/skills/bmad-create-product-brief/SKILL.md` exists.
   If missing, STOP and tell the operator. The framework is not installed.

4. **Phase 2 only — verify starting point:**
   If this is a Phase 2 run (RUN_LOG says Phase 2):
   Run: `git describe --tags --exact-match HEAD 2>/dev/null`
   Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the BMAD 4-phase workflow — ALL phases are MANDATORY:**

**PHASE 1 — Analysis (`bmad-create-product-brief`):**

Run: `echo '{"step":"bmad:product-brief","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-product-brief/SKILL.md`, which loads `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`.

Input: Use `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the product idea.

AUTONOMOUS RULES for product brief:
- The workflow has 6 interactive steps that ask questions about vision, users, metrics, scope. Answer ALL questions yourself using PROJECT_SPEC.md as the source of truth.
- When asked to choose between options or confirm: choose the option that best matches the spec.
- Save the product brief to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

Run: `echo '{"step":"bmad:product-brief","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 2 — Planning (`bmad-create-prd`):**

Run: `echo '{"step":"bmad:prd","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-prd/SKILL.md`, which loads `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`.

AUTONOMOUS RULES for PRD:
- Use the product brief from Phase 1 as input.
- The workflow has 12 steps (discovery through polish). Complete ALL steps.
- When asked about project type, scoping decisions, functional vs non-functional requirements: derive answers from the spec and product brief.
- Save the PRD to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

Run: `echo '{"step":"bmad:prd","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 3 — Solutioning (architecture + epics):**

Step 3a —

Run: `echo '{"step":"bmad:architecture","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-architecture/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`.

AUTONOMOUS RULES for architecture:
- Use the PRD from Phase 2 as input.
- When asked about technology choices: use Next.js, TypeScript, Tailwind CSS as established in the scaffold.
- Save architecture doc to `_bmad/docs/`.

Run: `echo '{"step":"bmad:architecture","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3b —

Run: `echo '{"step":"bmad:epics-and-stories","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-epics-and-stories/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`.

AUTONOMOUS RULES for epics and stories:
- Use PRD + architecture as input.
- Break the work into epics and stories as the workflow instructs.
- Save to `_bmad/docs/`.

Run: `echo '{"step":"bmad:epics-and-stories","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3c —

Run: `echo '{"step":"bmad:implementation-readiness","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-check-implementation-readiness/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`.

AUTONOMOUS RULES for readiness check:
- Validate all artifacts are consistent.
- Fix any issues found before proceeding to implementation.

Run: `echo '{"step":"bmad:implementation-readiness","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 4 — Implementation (sprint planning + dev stories):**

Step 4a —

Run: `echo '{"step":"bmad:sprint-planning","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-sprint-planning/SKILL.md`, which loads `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.md`.

AUTONOMOUS RULES for sprint planning:
- Generate sprint plan from epics/stories.
- Since this is a single-sprint project, put all stories in Sprint 1.

Run: `echo '{"step":"bmad:sprint-planning","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4b — For EACH story in the sprint plan:

Run: `echo '{"step":"bmad:story-implementation","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

First, read and follow `.claude/skills/bmad-create-story/SKILL.md` to create the story file.
Then, read and follow `.claude/skills/bmad-dev-story/SKILL.md` to implement it.

AUTONOMOUS RULES for story implementation:
- Follow the dev-story workflow checklist exactly.
- Commit after each completed story with messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving to the next story.
- Do NOT stop for user input.

Run: `echo '{"step":"bmad:story-implementation","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4c —

Run: `echo '{"step":"bmad:code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-code-review/SKILL.md` to review the completed code.

AUTONOMOUS RULES for code review:
- Fix critical issues. Log but skip cosmetic suggestions.

Run: `echo '{"step":"bmad:code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

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
   Check that the BMAD workflow produced its expected artifacts:
   - `_bmad/docs/` must contain: product brief, PRD, architecture doc, epics/stories
   - `metrics/workflow-log.jsonl` must contain completed entries for all 8 steps
   Run:
   ```
   echo '--- BMAD Adherence Check ---'
   echo "BMAD docs:" && ls _bmad/docs/ 2>/dev/null || echo "  NONE — BMAD analysis phases may not have run"
   echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
   echo "Expected steps: bmad:product-brief, bmad:prd, bmad:architecture, bmad:epics-and-stories, bmad:implementation-readiness, bmad:sprint-planning, bmad:story-implementation, bmad:code-review"
   ```
   If any expected artifacts are missing, flag it in the debrief as a **partial workflow bypass** — this is a critical finding for the experiment.

5. **Run measurement:**
   Run `npm run measure` and save the JSON report.

6. **Phase 2 delta report (Phase 2 only):**
   If this is Phase 2, read the Phase 1 metrics JSON from `metrics/` and display a comparison table:
   For each metric (e2e pass rate, Lighthouse scores, ESLint errors, duplication %, LOC, complexity), show:
   `Phase 1 value → Phase 2 value (delta)`

7. **Tag and push:**
   Tag the branch (e.g., `bmad-run2-phase1-complete`, `bmad-run2-phase2-complete`).
   Push commits and tags to remote.

**d) Operator debrief:**

Report to Muxin:

1. Key metrics from the measurement JSON
2. Workflow log summary: which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
3. Number of workflow-generated test files (if any)
4. Git build statistics: commit count, lines added/removed since scaffold
5. Framework adherence: which BMAD artifacts were produced, any missing steps
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
