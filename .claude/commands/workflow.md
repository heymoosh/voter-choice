## Meta

FRAMEWORK: BMAD Method
TAG_PREFIX: bmad
FRAMEWORK_CHECK: .claude/skills/bmad-create-product-brief

## Workflow Steps

Execute the BMAD 4-phase workflow. ALL phases are MANDATORY.

Phase spec to use per run phase:
- Phase 1: docs/PROJECT_SPEC.md
- Phase 2: docs/PHASE2_SPEC.md
- Phase 3: docs/PHASE3_SPEC.md
- Phase 4: docs/PHASE4_SPEC.md
- Phase 5: docs/PHASE5_SPEC.md

PHASE 1 — Analysis (bmad-create-product-brief):

Log start: echo '{"step":"bmad:product-brief","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-create-product-brief/SKILL.md with the phase spec as input. Answer all interactive questions yourself using the spec. Save output to _bmad/docs/. Do not stop for user input.

Log end: echo '{"step":"bmad:product-brief","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 2 — Planning (bmad-create-prd):

Log start: echo '{"step":"bmad:prd","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-create-prd/SKILL.md. Use product brief as input. Complete all steps. Save PRD to _bmad/docs/.

Log end: echo '{"step":"bmad:prd","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 3a — Architecture (bmad-create-architecture):

Log start: echo '{"step":"bmad:architecture","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-create-architecture/SKILL.md. Use Next.js, TypeScript, Tailwind CSS. Save to _bmad/docs/.

Log end: echo '{"step":"bmad:architecture","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 3b — Epics and Stories (bmad-create-epics-and-stories):

Log start: echo '{"step":"bmad:epics-and-stories","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-create-epics-and-stories/SKILL.md. Use PRD plus architecture. Save to _bmad/docs/.

Log end: echo '{"step":"bmad:epics-and-stories","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 3c — Implementation Readiness (bmad-check-implementation-readiness):

Log start: echo '{"step":"bmad:implementation-readiness","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-check-implementation-readiness/SKILL.md. Fix inconsistencies before proceeding.

Log end: echo '{"step":"bmad:implementation-readiness","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 4a — Sprint Planning (bmad-sprint-planning):

Log start: echo '{"step":"bmad:sprint-planning","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-sprint-planning/SKILL.md. All stories go into Sprint 1.

Log end: echo '{"step":"bmad:sprint-planning","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 4b — Story Implementation (bmad-create-story + bmad-dev-story, for each story):

Log start: echo '{"step":"bmad:story-implementation","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

For each story: run bmad-create-story to create the story file, then bmad-dev-story to implement it. Follow the dev-story DoD checklist. Commit after each story. Run tests and fix failures before moving on.

Log end: echo '{"step":"bmad:story-implementation","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

PHASE 4c — Code Review (bmad-code-review):

Log start: echo '{"step":"bmad:code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

Read and follow .claude/skills/bmad-code-review/SKILL.md. Fix critical issues. Skip cosmetic suggestions.

Log end: echo '{"step":"bmad:code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl

## Adherence Check

```bash
echo '--- BMAD Adherence Check ---'
echo "Skills present:" && ls .claude/skills/ | grep bmad | wc -l
echo "BMAD docs:" && ls _bmad/docs/ 2>/dev/null || echo "  NONE"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
```
