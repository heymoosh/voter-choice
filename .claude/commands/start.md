You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Skip to Step 3.

### If Phase 1 or Phase 2 (build / extend):
This is a full workflow run. You MUST use the **Superpowers workflow** described below. Do NOT skip any step. Do NOT code the solution directly without going through these steps.

**a) Clean environment:**
- `rm -rf node_modules .next coverage playwright-report.json`
- `npm install`

**b) Execute the Superpowers workflow — ALL steps are MANDATORY:**

**Step B1 — Brainstorm (`brainstorming`):**
Read and follow `.claude/skills/brainstorming/SKILL.md`.

Input: Use `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the feature description.

AUTONOMOUS RULES for brainstorming:
- The skill has a HARD-GATE requiring user approval of the design. In autonomous mode: once you have explored project context and formulated 2-3 approaches, select the approach that best matches the spec and **approve it yourself**. You ARE the user for this session.
- When the skill asks clarifying questions: answer them using PROJECT_SPEC.md.
- When asked to offer a "visual companion": skip this step (no visual display available).
- Save the design doc to `docs/superpowers/specs/` as the skill instructs.
- Run the spec-document-reviewer subagent as instructed. Fix issues it finds.
- After the spec review loop completes, consider the spec approved and transition to writing-plans.

**Step B2 — Write Plan (`writing-plans`):**
Read and follow `.claude/skills/writing-plans/SKILL.md`.

AUTONOMOUS RULES for writing-plans:
- Use the design doc from B1 as input.
- When the skill says to "raise concerns with your human partner": if the concern is a genuine spec conflict, note it in the plan and proceed. Do not stop.
- Save the plan to `docs/superpowers/plans/` as the skill instructs.
- Run the plan-document-reviewer subagent. Fix issues it finds.
- Do NOT create a git worktree. Work on the current branch.

**Step B3 — Execute Plan (`executing-plans` or `subagent-driven-development`):**
Read and follow `.claude/skills/executing-plans/SKILL.md`. If the plan has independent tasks, prefer `.claude/skills/subagent-driven-development/SKILL.md` instead.

AUTONOMOUS RULES for executing-plans:
- Follow the TDD Iron Law from `.claude/skills/test-driven-development/SKILL.md`: write a failing test FIRST, then implement to make it pass.
- When the skill says "stop and ask for help": attempt to resolve the issue yourself. Only stop if you encounter a genuine blocker that cannot be resolved from the spec or plan.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

**Step B4 — Code Review (`requesting-code-review`):**
Read and follow `.claude/skills/requesting-code-review/SKILL.md`.

AUTONOMOUS RULES for requesting-code-review:
- Dispatch the code-reviewer agent on the current branch.
- Fix critical and high-severity issues. Log but skip cosmetic suggestions.
- Commit fixes.

**Step B5 — Verify (`verification-before-completion`):**
Read and follow `.claude/skills/verification-before-completion/SKILL.md`.

AUTONOMOUS RULES for verification:
- Run ALL verification commands (tests, lint, build).
- Fix any failures. Do not claim completion until everything passes.

**Step B6 — Finish (`finishing-a-development-branch`):**
Read and follow `.claude/skills/finishing-a-development-branch/SKILL.md`.

AUTONOMOUS RULES for finishing:
- Do NOT merge to main. Do NOT create a PR. Choose "leave on branch" option.
- The experiment measures the branch in its current state.

**c) Post-build measurement:**
- Run `npm run measure` and save the JSON report.
- Tag the branch (e.g., `superpowers-phase1-complete`, `superpowers-phase2-complete`).
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