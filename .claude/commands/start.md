You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Spec Kit workflow** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Spec Kit workflow — ALL steps are MANDATORY:**

**Step B1 — Specify (`speckit.specify`):**
Read and follow `.claude/commands/speckit.specify.md` with this argument:
- Phase 1: `"Build the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `"Add Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for speckit.specify:
- When the command wants to create a feature branch: do NOT create a new branch. Stay on the current branch. Create the `.specify/features/` directory structure as the command requires, but skip `git checkout -b`.
- When asked to generate a short name: generate one yourself (e.g., `ballot-ranking-tool`).
- Read `docs/PROJECT_SPEC.md` to inform all spec decisions.
- Save the spec.md file in the feature directory as instructed.

**Step B2 — Clarify (`speckit.clarify`):**
Read and follow `.claude/commands/speckit.clarify.md`.

AUTONOMOUS RULES for speckit.clarify:
- This command asks up to 5 clarification questions about the spec. Answer ALL questions yourself using `docs/PROJECT_SPEC.md` as the source of truth.
- Encode answers back into spec.md as the command instructs.
- Do NOT stop or wait for user input.

**Step B3 — Plan (`speckit.plan`):**
Read and follow `.claude/commands/speckit.plan.md`.

AUTONOMOUS RULES for speckit.plan:
- Generate the technical implementation plan using the spec.
- When asked for technology choices: use Next.js, TypeScript, Tailwind CSS as specified in the scaffold.
- Save plan.md as instructed.

**Step B4 — Tasks (`speckit.tasks`):**
Read and follow `.claude/commands/speckit.tasks.md`.

AUTONOMOUS RULES for speckit.tasks:
- Generate the dependency-ordered task breakdown from plan.md.
- Save tasks.md as instructed.

**Step B5 — Analyze (`speckit.analyze`):**
Read and follow `.claude/commands/speckit.analyze.md`.

AUTONOMOUS RULES for speckit.analyze:
- Run the cross-artifact consistency analysis.
- Fix any inconsistencies found between spec.md, plan.md, and tasks.md.

**Step B6 — Implement (`speckit.implement`):**
Read and follow `.claude/commands/speckit.implement.md`.

AUTONOMOUS RULES for speckit.implement:
- Execute ALL tasks from tasks.md sequentially.
- When asked about incomplete checklists: proceed with implementation (answer "yes").
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.
- Do NOT stop or wait for user input at any point.

**c) Post-build measurement:**
- Run `npm run measure` and save the JSON report.
- Tag the branch (e.g., `speckit-phase1-complete`, `speckit-phase2-complete`).
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