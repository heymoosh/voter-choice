## Meta

FRAMEWORK: Superpowers
TAG_PREFIX: superpowers
FRAMEWORK_CHECK: .claude/skills/brainstorming/SKILL.md

## Workflow Steps

Superpowers workflow. All steps mandatory.

Phase spec: Phase 1=docs/PROJECT_SPEC.md, Phase 2=docs/PHASE2_SPEC.md, Phase 3=docs/PHASE3_SPEC.md, Phase 4=docs/PHASE4_SPEC.md, Phase 5=docs/PHASE5_SPEC.md

Step 1 brainstorming: Log start. Read .claude/skills/brainstorming/SKILL.md. Use current phase spec as input. When skill requests user approval, approve yourself after forming 2-3 approaches. Answer clarifying questions from spec. Save design doc to docs/superpowers/specs/. Log end.

Step 2 writing-plans: Log start. Read .claude/skills/writing-plans/SKILL.md. Use design doc from step 1. Work on current branch (no new worktree). Save plan to docs/superpowers/plans/. Log end.

Step 3 executing-plans: Log start. Read .claude/skills/executing-plans/SKILL.md or subagent-driven-development/SKILL.md for parallel tasks. Follow TDD Iron Law from .claude/skills/test-driven-development/SKILL.md. Commit with phase prefix. Log end.

Step 4 requesting-code-review: Log start. Read .claude/skills/requesting-code-review/SKILL.md. Dispatch reviewer agent. Fix critical issues. Commit. Log end.

Step 5 verification-before-completion: Log start. Read .claude/skills/verification-before-completion/SKILL.md. Run all tests and lint. Fix failures. Log end.

Step 6 finishing-a-development-branch: Log start. Read .claude/skills/finishing-a-development-branch/SKILL.md. Choose leave on branch. Do not create PR or merge. Log end.

Logging pattern for each step start: echo '{"step":"<step-name>","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Logging pattern for each step end: echo '{"step":"<step-name>","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

## Adherence Check

```bash
echo '--- Superpowers Adherence Check ---'
ls .claude/skills/brainstorming/SKILL.md 2>/dev/null && echo "skills present" || echo "MISSING"
ls docs/superpowers/specs/ 2>/dev/null || echo "NONE design docs"
ls docs/superpowers/plans/ 2>/dev/null || echo "NONE plan docs"
grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "none"
```
