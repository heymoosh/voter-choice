You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **BMAD Method 4-phase workflow** described below. Do NOT skip any phase. Do NOT code the solution directly without going through these phases.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the BMAD 4-phase workflow — ALL phases are MANDATORY:**

**PHASE 1 — Analysis (`bmad-create-product-brief`):**
Read and follow `.claude/skills/bmad-create-product-brief/SKILL.md`, which loads `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`.

Input: Use `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the product idea.

AUTONOMOUS RULES for product brief:
- The workflow has 6 interactive steps that ask questions about vision, users, metrics, scope. Answer ALL questions yourself using PROJECT_SPEC.md as the source of truth.
- When asked to choose between options or confirm: choose the option that best matches the spec.
- Save the product brief to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

**PHASE 2 — Planning (`bmad-create-prd`):**
Read and follow `.claude/skills/bmad-create-prd/SKILL.md`, which loads `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`.

AUTONOMOUS RULES for PRD:
- Use the product brief from Phase 1 as input.
- The workflow has 12 steps (discovery through polish). Complete ALL steps.
- When asked about project type, scoping decisions, functional vs non-functional requirements: derive answers from the spec and product brief.
- Save the PRD to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

**PHASE 3 — Solutioning (architecture + epics):**

Step 3a — Read and follow `.claude/skills/bmad-create-architecture/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`.

AUTONOMOUS RULES for architecture:
- Use the PRD from Phase 2 as input.
- When asked about technology choices: use Next.js, TypeScript, Tailwind CSS as established in the scaffold.
- Save architecture doc to `_bmad/docs/`.

Step 3b — Read and follow `.claude/skills/bmad-create-epics-and-stories/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`.

AUTONOMOUS RULES for epics and stories:
- Use PRD + architecture as input.
- Break the work into epics and stories as the workflow instructs.
- Save to `_bmad/docs/`.

Step 3c — Read and follow `.claude/skills/bmad-check-implementation-readiness/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`.

AUTONOMOUS RULES for readiness check:
- Validate all artifacts are consistent.
- Fix any issues found before proceeding to implementation.

**PHASE 4 — Implementation (sprint planning + dev stories):**

Step 4a — Read and follow `.claude/skills/bmad-sprint-planning/SKILL.md`, which loads `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.md`.

AUTONOMOUS RULES for sprint planning:
- Generate sprint plan from epics/stories.
- Since this is a single-sprint project, put all stories in Sprint 1.

Step 4b — For EACH story in the sprint plan:
First, read and follow `.claude/skills/bmad-create-story/SKILL.md` to create the story file.
Then, read and follow `.claude/skills/bmad-dev-story/SKILL.md` to implement it.

AUTONOMOUS RULES for story implementation:
- Follow the dev-story workflow checklist exactly.
- Commit after each completed story with messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving to the next story.
- Do NOT stop for user input.

Step 4c — Read and follow `.claude/skills/bmad-code-review/SKILL.md` to review the completed code.

AUTONOMOUS RULES for code review:
- Fix critical issues. Log but skip cosmetic suggestions.

**c) Post-build measurement:**
- Run `npm run measure` and save the JSON report.
- Tag the branch (e.g., `bmad-phase1-complete`, `bmad-phase2-complete`).
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