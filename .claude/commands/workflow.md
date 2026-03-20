## Meta

FRAMEWORK: BMAD Method
TAG_PREFIX: bmad
FRAMEWORK_CHECK: _bmad/

## Workflow Steps

Execute the BMAD 4-phase workflow — ALL phases are MANDATORY.

**PHASE 1 — Analysis (`bmad-create-product-brief`):**

Run: `echo '{"step":"bmad:product-brief","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-product-brief/SKILL.md`, which loads `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`.

Input: Use `docs/PROJECT_SPEC.md` (Phase 1) or `docs/PHASE2_SPEC.md` (Phase 2) as the product idea.

AUTONOMOUS RULES for product brief:
- The workflow has 6 interactive steps that ask questions about vision, users, metrics, scope. Answer ALL questions yourself using PROJECT_SPEC.md as the source of truth.
- When asked to choose between options or confirm: choose the option that best matches the spec.
- Save the product brief to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

Run: `echo '{"step":"bmad:product-brief","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 2 — Planning (`bmad-create-prd`):**

Run: `echo '{"step":"bmad:prd","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-prd/SKILL.md`, which loads `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`.

AUTONOMOUS RULES for PRD:
- Use the product brief from Phase 1 as input.
- The workflow has 12 steps (discovery through polish). Complete ALL steps.
- When asked about project type, scoping decisions, functional vs non-functional requirements: derive answers from the spec and product brief.
- Save the PRD to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

Run: `echo '{"step":"bmad:prd","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 3 — Solutioning (architecture + epics):**

Step 3a — Architecture:

Run: `echo '{"step":"bmad:architecture","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-architecture/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`.

AUTONOMOUS RULES for architecture:
- Use the PRD from Phase 2 as input.
- When asked about technology choices: use Next.js, TypeScript, Tailwind CSS as established in the scaffold.
- Save architecture doc to `_bmad/docs/`.

Run: `echo '{"step":"bmad:architecture","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3b — Epics and Stories:

Run: `echo '{"step":"bmad:epics-and-stories","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-create-epics-and-stories/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`.

AUTONOMOUS RULES for epics and stories:
- Use PRD + architecture as input.
- Break the work into epics and stories as the workflow instructs.
- Save to `_bmad/docs/`.

Run: `echo '{"step":"bmad:epics-and-stories","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3c — Implementation Readiness:

Run: `echo '{"step":"bmad:implementation-readiness","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-check-implementation-readiness/SKILL.md`, which loads `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`.

AUTONOMOUS RULES for readiness check:
- Validate all artifacts are consistent.
- Fix any issues found before proceeding to implementation.

Run: `echo '{"step":"bmad:implementation-readiness","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 4 — Implementation (sprint planning + dev stories):**

Step 4a — Sprint Planning:

Run: `echo '{"step":"bmad:sprint-planning","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-sprint-planning/SKILL.md`, which loads `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.md`.

AUTONOMOUS RULES for sprint planning:
- Generate sprint plan from epics/stories.
- Since this is a single-sprint project, put all stories in Sprint 1.

Run: `echo '{"step":"bmad:sprint-planning","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4b — Story Implementation (for EACH story in the sprint plan):

Run: `echo '{"step":"bmad:story-implementation","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

First, read and follow `.claude/skills/bmad-create-story/SKILL.md` to create the story file.
Then, read and follow `.claude/skills/bmad-dev-story/SKILL.md` to implement it.

AUTONOMOUS RULES for story implementation:
- Follow the dev-story workflow checklist exactly.
- Commit after each completed story with messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving to the next story.
- Do NOT stop for user input.

Run: `echo '{"step":"bmad:story-implementation","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4c — Code Review:

Run: `echo '{"step":"bmad:code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Read and follow `.claude/skills/bmad-code-review/SKILL.md` to review the completed code.

AUTONOMOUS RULES for code review:
- Fix critical issues. Log but skip cosmetic suggestions.

Run: `echo '{"step":"bmad:code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the BMAD workflow produced its expected artifacts:
- `_bmad/docs/` must contain: product brief, PRD, architecture doc, epics/stories
- `metrics/workflow-log.jsonl` must contain completed entries for all 8 steps

Run:

```bash
echo '--- BMAD Adherence Check ---'
echo "BMAD docs:" && ls _bmad/docs/ 2>/dev/null || echo "  NONE — BMAD analysis phases may not have run"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
echo "Expected steps: bmad:product-brief, bmad:prd, bmad:architecture, bmad:epics-and-stories, bmad:implementation-readiness, bmad:sprint-planning, bmad:story-implementation, bmad:code-review"
```
