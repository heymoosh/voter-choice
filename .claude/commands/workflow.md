## Meta

FRAMEWORK: Superpowers
TAG_PREFIX: superpowers
FRAMEWORK_CHECK: .claude/skills/brainstorming/SKILL.md

## Workflow Steps

Execute the Superpowers workflow — ALL steps are MANDATORY.

**Step 1 — Brainstorm (`brainstorming`):**

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

**Step 2 — Write Plan (`writing-plans`):**

Run: `echo '{"step":"writing-plans","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/writing-plans/SKILL.md`.

AUTONOMOUS RULES for writing-plans:
- Use the design doc from Step 1 as input.
- When the skill says to "raise concerns with your human partner": if the concern is a genuine spec conflict, note it in the plan and proceed. Do not stop.
- Save the plan to `docs/superpowers/plans/` as the skill instructs.
- Run the plan-document-reviewer subagent. Fix issues it finds.
- Do NOT create a git worktree. Work on the current branch.

Run: `echo '{"step":"writing-plans","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 3 — Execute Plan (`executing-plans` or `subagent-driven-development`):**

Run: `echo '{"step":"executing-plans","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/executing-plans/SKILL.md`. If the plan has independent tasks, prefer `.claude/skills/subagent-driven-development/SKILL.md` instead.

AUTONOMOUS RULES for executing-plans:
- Follow the TDD Iron Law from `.claude/skills/test-driven-development/SKILL.md`: write a failing test FIRST, then implement to make it pass.
- When the skill says "stop and ask for help": attempt to resolve the issue yourself. Only stop if you encounter a genuine blocker that cannot be resolved from the spec or plan.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

Run: `echo '{"step":"executing-plans","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 4 — Code Review (`requesting-code-review`):**

Run: `echo '{"step":"requesting-code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/requesting-code-review/SKILL.md`.

AUTONOMOUS RULES for requesting-code-review:
- Dispatch the code-reviewer agent on the current branch.
- Fix critical and high-severity issues. Log but skip cosmetic suggestions.
- Commit fixes.

Run: `echo '{"step":"requesting-code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 5 — Verify (`verification-before-completion`):**

Run: `echo '{"step":"verification-before-completion","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/verification-before-completion/SKILL.md`.

AUTONOMOUS RULES for verification:
- Run ALL verification commands (tests, lint, build).
- Fix any failures. Do not claim completion until everything passes.

Run: `echo '{"step":"verification-before-completion","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 6 — Finish (`finishing-a-development-branch`):**

Run: `echo '{"step":"finishing-a-development-branch","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/finishing-a-development-branch/SKILL.md`.

AUTONOMOUS RULES for finishing:
- Do NOT merge to main. Do NOT create a PR. Choose "leave on branch" option.
- The experiment measures the branch in its current state.

Run: `echo '{"step":"finishing-a-development-branch","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the Superpowers workflow produced its expected artifacts:
- `docs/superpowers/specs/` must contain at least one design doc (from brainstorming)
- `docs/superpowers/plans/` must contain at least one plan file (from writing-plans)
- `metrics/workflow-log.jsonl` must contain completed entries for all 6 steps

Run:

```bash
echo '--- Superpowers Adherence Check ---'
echo "Design docs:" && ls docs/superpowers/specs/ 2>/dev/null || echo "  NONE — brainstorming may not have run"
echo "Plan docs:" && ls docs/superpowers/plans/ 2>/dev/null || echo "  NONE — writing-plans may not have run"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
echo "Expected steps: brainstorming, writing-plans, executing-plans, requesting-code-review, verification-before-completion, finishing-a-development-branch"
```
