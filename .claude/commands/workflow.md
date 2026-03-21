## Meta

FRAMEWORK: BMAD Method
TAG_PREFIX: bmad
FRAMEWORK_CHECK: _bmad/

## Workflow Steps

Execute the BMAD 4-phase workflow — ALL phases are MANDATORY.

**CRITICAL: Use the Skill tool to invoke each command.** Do NOT read skill/command files as reference text. The Skill tool activates the command as an executable procedure. "Read and follow" degrades enforcement — see Learning 005/006.

**PHASE 1 — Analysis (`bmad-create-product-brief`):**

Run: `echo '{"step":"bmad:product-brief","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- Phase 1: `skill: "bmad-create-product-brief", args: "Create product brief for the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `skill: "bmad-create-product-brief", args: "Create product brief for Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for product brief:
- The workflow has 6 interactive steps that ask questions about vision, users, metrics, scope. Answer ALL questions yourself using PROJECT_SPEC.md as the source of truth.
- When asked to choose between options or confirm: choose the option that best matches the spec.
- Save the product brief to `_bmad/docs/` as the workflow instructs.
- Do NOT stop for user input at any step.

Run: `echo '{"step":"bmad:product-brief","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 2 — Planning (`bmad-create-prd`):**

Run: `echo '{"step":"bmad:prd","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- `skill: "bmad-create-prd", args: "Create PRD from the product brief in _bmad/docs/"`

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

Invoke via the Skill tool:
- `skill: "bmad-create-architecture", args: "Create architecture from the PRD in _bmad/docs/"`

AUTONOMOUS RULES for architecture:
- Use the PRD from Phase 2 as input.
- When asked about technology choices: use Next.js, TypeScript, Tailwind CSS as established in the scaffold.
- Save architecture doc to `_bmad/docs/`.

Run: `echo '{"step":"bmad:architecture","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3b — Epics and Stories:

Run: `echo '{"step":"bmad:epics-and-stories","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- `skill: "bmad-create-epics-and-stories", args: "Create epics and stories from the PRD and architecture in _bmad/docs/"`

AUTONOMOUS RULES for epics and stories:
- Use PRD + architecture as input.
- Break the work into epics and stories as the workflow instructs.
- Save to `_bmad/docs/`.

Run: `echo '{"step":"bmad:epics-and-stories","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 3c — Implementation Readiness:

Run: `echo '{"step":"bmad:implementation-readiness","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- `skill: "bmad-check-implementation-readiness", args: "Validate all BMAD artifacts in _bmad/docs/ are complete and consistent"`

AUTONOMOUS RULES for readiness check:
- Validate all artifacts are consistent.
- Fix any issues found before proceeding to implementation.

Run: `echo '{"step":"bmad:implementation-readiness","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**PHASE 4 — Implementation (sprint planning + dev stories):**

Step 4a — Sprint Planning:

Run: `echo '{"step":"bmad:sprint-planning","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- `skill: "bmad-sprint-planning", args: "Generate sprint plan from epics and stories in _bmad/docs/"`

AUTONOMOUS RULES for sprint planning:
- Generate sprint plan from epics/stories.
- Since this is a single-sprint project, put all stories in Sprint 1.

Run: `echo '{"step":"bmad:sprint-planning","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4b — Story Implementation (for EACH story in the sprint plan):

Run: `echo '{"step":"bmad:story-implementation","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

For each story in the sprint plan, invoke TWO skills in sequence:

First, create the story file:
- `skill: "bmad-create-story", args: "Create story file for [story identifier from sprint plan]"`

Then, implement the story:
- `skill: "bmad-dev-story", args: "Implement the story file just created"`

AUTONOMOUS RULES for story implementation:
- Follow the dev-story workflow checklist exactly.
- Commit after each completed story with messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving to the next story.
- Do NOT stop for user input.

Run: `echo '{"step":"bmad:story-implementation","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Step 4c — Code Review:

Run: `echo '{"step":"bmad:code-review","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- `skill: "bmad-code-review", args: "Review the completed ballot tool code"`

AUTONOMOUS RULES for code review:
- Fix critical issues. Log but skip cosmetic suggestions.

Run: `echo '{"step":"bmad:code-review","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the BMAD workflow produced its expected artifacts AND used proper Skill invocation:
- `_bmad/docs/` must contain: product brief, PRD, architecture doc, epics/stories
- `metrics/workflow-log.jsonl` must contain completed entries for all 8 steps
- Verify Skill tool was used (not "read and follow") for each step

Run:

```bash
echo '--- BMAD Adherence Check ---'
echo "BMAD docs:" && ls _bmad/docs/ 2>/dev/null || echo "  NONE — BMAD analysis phases may not have run"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
echo "Expected steps: bmad:product-brief, bmad:prd, bmad:architecture, bmad:epics-and-stories, bmad:implementation-readiness, bmad:sprint-planning, bmad:story-implementation, bmad:code-review"
echo "Commands in .claude/commands/:" && ls .claude/commands/bmad-*.md 2>/dev/null | wc -l | xargs echo "  count:"
```
