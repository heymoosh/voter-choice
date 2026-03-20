## Meta

FRAMEWORK: Compound Engineering
TAG_PREFIX: ce
FRAMEWORK_CHECK: .claude/skills/ce-plan/SKILL.md

## Workflow Steps

Execute the Compound Engineering workflow — ALL steps are MANDATORY.

**Step 1 — Plan (`ce:plan`):**

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

**Step 2 — Work (`ce:work`):**

Run: `echo '{"step":"ce:work","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-work/SKILL.md` with the plan file path from Step 1 as argument.

AUTONOMOUS RULES for ce:work:
- When asked about branch strategy: choose "Continue on current branch."
- When asked for clarification: make the decision yourself using the spec and plan.
- Create a TodoWrite task list from the plan and work through it systematically.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.

Run: `echo '{"step":"ce:work","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 3 — Review (`ce:review`):**

Run: `echo '{"step":"ce:review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-review/SKILL.md` with argument `"current branch"`.

AUTONOMOUS RULES for ce:review:
- Review the code on the current branch (do not create a PR for this).
- When asked about execution mode: use `--serial` to conserve context.
- Fix any critical or high-severity issues found. Commit fixes.
- Log but skip cosmetic/style-only suggestions.

Run: `echo '{"step":"ce:review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 4 — Compound (`ce:compound`):**

Run: `echo '{"step":"ce:compound","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/ce-compound/SKILL.md` with argument `"Built ballot ranking tool using Compound Engineering workflow"`.

AUTONOMOUS RULES for ce:compound:
- Choose "compact-safe mode" (option 2) to conserve context.
- Document the solution in `docs/solutions/` as the skill instructs.
- This step is about knowledge capture — do not skip it.

Run: `echo '{"step":"ce:compound","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the Compound Engineering workflow produced its expected artifacts:
- `docs/plans/` must contain at least one plan file (from ce:plan)
- `docs/solutions/` must contain at least one solution file (from ce:compound)
- `metrics/workflow-log.jsonl` must contain completed entries for all 4 steps

Run:

```bash
echo '--- CE Adherence Check ---'
echo "Plan files:" && ls docs/plans/ 2>/dev/null || echo "  NONE — ce:plan may not have run"
echo "Solution files:" && ls docs/solutions/ 2>/dev/null || echo "  NONE — ce:compound may not have run"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
echo "Expected steps: ce:plan, ce:work, ce:review, ce:compound"
```
