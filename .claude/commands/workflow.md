## Meta

FRAMEWORK: Compound Engineering
TAG_PREFIX: ce
FRAMEWORK_CHECK: .claude/skills/ce-plan/SKILL.md

## Workflow Steps

CE workflow. All steps mandatory.

Phase spec: Phase 1=docs/PROJECT_SPEC.md, Phase 2=docs/PHASE2_SPEC.md, Phase 3=docs/PHASE3_SPEC.md, Phase 4=docs/PHASE4_SPEC.md, Phase 5=docs/PHASE5_SPEC.md

Step 1 ce:plan: Log start. Read .claude/skills/ce-plan/SKILL.md with the current phase spec as argument. When skill asks questions, answer from the spec. When asked about branches, stay on current branch. Choose standard research level. Save plan to docs/plans/. Log end.

Step 2 ce:work: Log start. Read .claude/skills/ce-work/SKILL.md with the plan file path from step 1. Choose continue on current branch. Create TodoWrite task list from plan. Commit regularly with phase prefix. Fix test failures before moving on. Log end.

Step 3 ce:review: Log start. Read .claude/skills/ce-review/SKILL.md with current branch as argument. Use --serial mode. Fix critical/high issues. Commit fixes. Log end.

Step 4 ce:compound: Log start. Read .claude/skills/ce-compound/SKILL.md with argument "Built ballot research tool using Compound Engineering workflow". Choose compact-safe mode. Document solution in docs/solutions/. Log end.

Logging pattern: echo '{"step":"<step>","status":"<started|completed>","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

## Adherence Check

```bash
echo '--- CE Adherence Check ---'
ls .claude/skills/ce-plan/SKILL.md 2>/dev/null && echo "ce-plan skill present" || echo "MISSING"
ls docs/plans/ 2>/dev/null || echo "NONE plan files"
ls docs/solutions/ 2>/dev/null || echo "NONE solution files"
grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "none"
```
