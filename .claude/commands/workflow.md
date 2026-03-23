## Meta

FRAMEWORK: Spec Kit
TAG_PREFIX: speckit
FRAMEWORK_CHECK: .claude/commands/speckit.specify.md

## Workflow Steps

Execute the Spec Kit workflow — ALL steps are MANDATORY.

**CRITICAL: Use the Skill tool to invoke each command.** Do NOT read command files as reference text. The Skill tool activates the command as an executable procedure. "Read and follow" degrades enforcement — see Learning 005/006.

### Resume Check

Before starting, detect whether a previous session partially completed this workflow. Run:

```bash
echo '--- Resume Detection ---'
if [ ! -f metrics/workflow-log.jsonl ]; then
  echo "RESUME_FROM=step1"
else
  STEPS=("speckit.constitution" "speckit.specify" "speckit.clarify" "speckit.plan" "speckit.tasks" "speckit.checklist" "speckit.analyze" "speckit.implement")
  STEP_NUMS=("step0" "step1" "step2" "step3" "step4" "step4b" "step5" "step6")
  RESUME="step0"
  for i in "${!STEPS[@]}"; do
    step="${STEPS[$i]}"
    if grep -q "\"step\":\"$step\".*\"status\":\"completed\"" metrics/workflow-log.jsonl; then
      next_idx=$((i + 1))
      if [ $next_idx -lt ${#STEP_NUMS[@]} ]; then
        RESUME="${STEP_NUMS[$next_idx]}"
      else
        RESUME="done"
      fi
    fi
  done
  echo "RESUME_FROM=$RESUME"
  echo "Completed steps:"
  grep '"status":"completed"' metrics/workflow-log.jsonl | grep -o '"step":"[^"]*"' || echo "  none"
fi
```

**If RESUME_FROM=done:** All steps completed. Skip to the Adherence Check section.
**If RESUME_FROM=stepN:** Skip all steps before step N. They already ran and their artifacts are committed. Begin execution at step N (re-logging its "started" entry is fine — the log is append-only).
**If RESUME_FROM=step0:** No prior progress. Execute all steps from the beginning.

**Step 0 — Constitution (`speckit.constitution`):**

Run: `echo '{"step":"speckit.constitution","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- Phase 1: `skill: "speckit.constitution", args: "Establish project principles for the ballot research tool per docs/PROJECT_SPEC.md"`
- Phase 2: `skill: "speckit.constitution", args: "Update project principles for Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for speckit.constitution:
- This command creates a project constitution (principles and guidelines) at `.specify/memory/constitution.md`.
- When asked for project principles: derive them from PROJECT_SPEC.md — prioritize accessibility, mobile-first design, static data architecture, and civic utility.
- When asked for governance decisions or ratification: approve them yourself.
- Do NOT stop or wait for user input.

Run: `echo '{"step":"speckit.constitution","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 1 — Specify (`speckit.specify`):**

Run: `echo '{"step":"speckit.specify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool:
- Phase 1: `skill: "speckit.specify", args: "Build the ballot ranking tool per docs/PROJECT_SPEC.md"`
- Phase 2: `skill: "speckit.specify", args: "Add Spanish language support per docs/PHASE2_SPEC.md"`

AUTONOMOUS RULES for speckit.specify:
- When the command wants to create a feature branch: do NOT create a new branch. Stay on the current branch. Create the `.specify/features/` directory structure as the command requires, but skip `git checkout -b`.
- When asked to generate a short name: generate one yourself (e.g., `ballot-ranking-tool`).
- Read `docs/PROJECT_SPEC.md` to inform all spec decisions.
- Save the spec.md file in the feature directory as instructed.

Run: `echo '{"step":"speckit.specify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 2 — Clarify (`speckit.clarify`):**

Run: `echo '{"step":"speckit.clarify","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.clarify"`

AUTONOMOUS RULES for speckit.clarify:
- This command asks up to 5 clarification questions about the spec. Answer ALL questions yourself using `docs/PROJECT_SPEC.md` as the source of truth.
- Encode answers back into spec.md as the command instructs.
- Do NOT stop or wait for user input.

Run: `echo '{"step":"speckit.clarify","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 3 — Plan (`speckit.plan`):**

Run: `echo '{"step":"speckit.plan","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.plan"`

AUTONOMOUS RULES for speckit.plan:
- Generate the technical implementation plan using the spec.
- When asked for technology choices: use Next.js, TypeScript, Tailwind CSS as specified in the scaffold.
- Save plan.md as instructed.

Run: `echo '{"step":"speckit.plan","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 4 — Tasks (`speckit.tasks`):**

Run: `echo '{"step":"speckit.tasks","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.tasks"`

AUTONOMOUS RULES for speckit.tasks:
- Generate the dependency-ordered task breakdown from plan.md.
- Save tasks.md as instructed.

Run: `echo '{"step":"speckit.tasks","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 4b — Checklist (`speckit.checklist`):**

Run: `echo '{"step":"speckit.checklist","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.checklist", args: "Validate requirements quality for the ballot research tool"`

AUTONOMOUS RULES for speckit.checklist:
- This command generates a requirements quality checklist — it validates whether the spec is complete, clear, and unambiguous (NOT whether implementation works).
- When asked clarifying questions about checklist focus: prioritize accessibility requirements, error state completeness, and data model coverage.
- Review the generated checklist findings and fix any spec gaps it identifies.
- Do NOT stop or wait for user input.

Run: `echo '{"step":"speckit.checklist","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 5 — Analyze (`speckit.analyze`):**

Run: `echo '{"step":"speckit.analyze","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.analyze"`

AUTONOMOUS RULES for speckit.analyze:
- Run the cross-artifact consistency analysis.
- Fix any inconsistencies found between spec.md, plan.md, and tasks.md.

Run: `echo '{"step":"speckit.analyze","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

**Step 6 — Implement (`speckit.implement`):**

Run: `echo '{"step":"speckit.implement","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

Invoke via the Skill tool: `skill: "speckit.implement"`

AUTONOMOUS RULES for speckit.implement:
- Execute ALL tasks from tasks.md sequentially.
- When asked about incomplete checklists: proceed with implementation (answer "yes").
- Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.
- Run tests as you go. Fix failures before moving on.
- Do NOT stop or wait for user input at any point.

Run: `echo '{"step":"speckit.implement","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl`

## Adherence Check

Check that the Spec Kit workflow produced its expected artifacts:
- `.specify/features/` must contain a feature directory with `spec.md` (from speckit.specify)
- Feature directory must contain `plan.md` (from speckit.plan) and `tasks.md` (from speckit.tasks)
- `.specify/memory/constitution.md` must be populated (from speckit.constitution)
- `metrics/workflow-log.jsonl` must contain completed entries for all 8 steps
- Verify that the Skill tool was used (not just file reads) for command invocation

Run:

```bash
echo '--- Spec Kit Adherence Check ---'
echo "Feature directories:" && ls .specify/features/ 2>/dev/null || echo "  NONE — speckit.specify may not have run"
echo "Spec files:" && find .specify/features -name "spec.md" 2>/dev/null || echo "  NONE"
echo "Plan files:" && find .specify/features -name "plan.md" 2>/dev/null || echo "  NONE"
echo "Task files:" && find .specify/features -name "tasks.md" 2>/dev/null || echo "  NONE"
echo "Workflow steps completed:" && grep '"status":"completed"' metrics/workflow-log.jsonl 2>/dev/null | grep -o '"step":"[^"]*"' || echo "  NONE"
echo "Constitution:" && cat .specify/memory/constitution.md 2>/dev/null | head -5 || echo "  EMPTY — speckit.constitution may not have run"
echo "Expected steps: speckit.constitution, speckit.specify, speckit.clarify, speckit.plan, speckit.tasks, speckit.checklist, speckit.analyze, speckit.implement"
```
