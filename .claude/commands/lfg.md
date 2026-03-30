---
name: lfg
description: Full autonomous engineering workflow
argument-hint: "[feature description]"
---

CRITICAL: You MUST execute every step below IN ORDER using the Skill tool. Do NOT skip any step. Do NOT jump ahead to coding or implementation. Do NOT read SKILL.md files with the Read tool — use the Skill tool to invoke each command. The plan phase (steps 1-2) MUST be completed and verified BEFORE any work begins. Violating this order produces bad output.

Each step below MUST be invoked via the Skill tool like this: `skill: "ce-plan", args: "..."`. The commands are registered in `.claude/commands/` and available to the Skill tool.

1. Invoke: `skill: "ce-plan", args: "$ARGUMENTS"`

   GATE: STOP. Verify that ce:plan produced a plan file in `docs/plans/`. If no plan file was created, invoke ce-plan again. Do NOT proceed to step 2 until a written plan exists.

2. Invoke: `skill: "deepen-plan", args: "[path to plan file from step 1]"`

   GATE: STOP. Confirm the plan has been deepened and updated. The plan file in `docs/plans/` should now contain additional detail. Do NOT proceed to step 3 without a deepened plan.

3. Invoke: `skill: "ce-work"`

   GATE: STOP. Verify that implementation work was performed — files were created or modified beyond the plan. Do NOT proceed to step 4 if no code changes were made.

4. Invoke: `skill: "ce-review", args: "--serial"`

5. Invoke: `skill: "resolve-todo-parallel"`

6. Invoke: `skill: "ce-compound"`

   GATE: STOP. Verify that `docs/solutions/` contains at least one solution file. ce:compound is the knowledge-compounding step — CE's core differentiator. Do NOT skip it.

7. Invoke: `skill: "test-browser"` (if it fails or is unavailable, log and continue)

8. Invoke: `skill: "feature-video"` (if it fails or is unavailable, log and continue)

9. Output `<promise>DONE</promise>` when complete.

Start with step 1 now. Remember: plan FIRST, then work. Never skip the plan. Never read SKILL.md files — always use the Skill tool.
