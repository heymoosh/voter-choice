## Meta

FRAMEWORK: Compound Engineering
TAG_PREFIX: ce
FRAMEWORK_CHECK: .claude/skills/ce-plan/SKILL.md

## Workflow Steps

This branch uses the Compound Engineering autonomous pipeline (`/lfg`). Instead of manually sequencing CE steps, invoke `/lfg` which chains them with GATE checks.

**Step 1 — Log start:**

Run: `echo '{"step":"lfg","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 2 — Invoke /lfg:**

Use the Skill tool to invoke the `/lfg` skill with argument:

- Phase 1: `"Build the ballot research tool per docs/PROJECT_SPEC.md"`
- Phase 2: `"Add Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES (apply to ALL steps within /lfg):

- When ANY CE skill asks you to "ask the user", presents menus, or asks clarifying questions: answer them yourself using `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the source of truth. Do NOT stop or wait.
- When asked about branches: stay on the current branch. Do not create a new branch.
- When offered a choice between research levels: choose "standard" (not minimal, not deep).
- When asked about execution mode for review: use `--serial` to conserve context.
- When asked about context budget for ce:compound: choose "compact-safe mode" (option 2).
- If test-browser or feature-video steps fail or the skill is unavailable, log the failure and continue — these are optional tooling steps.
- Do NOT push to remote or create a PR — the /start command handles that after workflow completes.
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.

**Step 3 — Log end:**

After /lfg completes, run: `echo '{"step":"lfg","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the Compound Engineering /lfg pipeline produced its expected artifacts:

- `docs/plans/` must contain at least one plan file (from ce:plan)
- `docs/solutions/` must contain at least one solution file (from ce:compound)
- `metrics/workflow-log.jsonl` must contain lfg start/complete entries

Run:

```bash
echo '--- CE Adherence Check ---'
echo "Plan files:" && ls docs/plans/ 2>/dev/null || echo "  NONE — ce:plan may not have run"
echo "Solution files:" && ls docs/solutions/ 2>/dev/null || echo "  NONE — ce:compound may not have run"
echo "Workflow log:" && cat metrics/workflow-log.jsonl 2>/dev/null || echo "  NONE"
echo "Expected: lfg started + completed entries"
```
