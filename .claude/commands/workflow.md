## Meta

FRAMEWORK: Spec Kit
TAG_PREFIX: speckit
FRAMEWORK_CHECK: .claude/commands/speckit.specify.md

## Workflow Steps

Execute the Spec Kit workflow. ALL steps MANDATORY. Phase spec: Phase 1=docs/PROJECT_SPEC.md, Phase 2=docs/PHASE2_SPEC.md, Phase 3=docs/PHASE3_SPEC.md, Phase 4=docs/PHASE4_SPEC.md, Phase 5=docs/PHASE5_SPEC.md.

Step 1 speckit.specify: echo '{"step":"speckit.specify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.specify.md. Do NOT create a new branch. Stay on current branch, create .specify/features/ structure. Generate a feature name from the phase spec. Answer all questions from the phase spec. echo '{"step":"speckit.specify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Step 2 speckit.clarify: echo '{"step":"speckit.clarify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.clarify.md. Answer all questions from the phase spec. Encode answers into spec.md. echo '{"step":"speckit.clarify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Step 3 speckit.plan: echo '{"step":"speckit.plan","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.plan.md. Use Next.js, TypeScript, Tailwind. Save plan.md. echo '{"step":"speckit.plan","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Step 4 speckit.tasks: echo '{"step":"speckit.tasks","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.tasks.md. Save tasks.md. echo '{"step":"speckit.tasks","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Step 5 speckit.analyze: echo '{"step":"speckit.analyze","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.analyze.md. Fix inconsistencies between spec.md, plan.md, tasks.md. echo '{"step":"speckit.analyze","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Step 6 speckit.implement: echo '{"step":"speckit.implement","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl && Read and follow .claude/commands/speckit.implement.md. Execute all tasks from tasks.md. Commit regularly with phase<N>: prefix. Run tests and fix failures. Do NOT stop for input. echo '{"step":"speckit.implement","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

## Adherence Check

```bash
echo '--- Spec Kit Adherence Check ---'
ls .claude/commands/speckit.specify.md 2>/dev/null && echo "speckit.specify present" || echo "MISSING speckit.specify.md"
ls .specify/features/ 2>/dev/null && echo "feature dirs present" || echo "NONE — speckit.specify may not have run"
find .specify/features -name "spec.md" 2>/dev/null | head -3
find .specify/features -name "plan.md" 2>/dev/null | head -3
find .specify/features -name "tasks.md" 2>/dev/null | head -3
grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "no completed steps logged"
```
