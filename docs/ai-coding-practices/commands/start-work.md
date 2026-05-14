# /start-work

Purpose: session-start procedure for orienting to repo state and routing the user's plain-language request.

Decision owners:

- Routing: `docs/ai-coding-practices/guardrails/request-routing.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Commercial app readiness: `docs/ai-coding-practices/guardrails/commercial-app-readiness.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`

## Steps

1. Run `bash scripts/ai-preflight.sh` if present.
2. Check git status and active worktrees/sibling sessions.
3. Read `TRACKER.md` if present.
4. Ask what the user wants to work on if they have not already said it.
5. Follow request routing: restate intent, state route, ask only material questions, re-route after clarification.
6. Read only the relevant work packet or project brief if one already exists.
7. If business/domain rules may affect implementation or evaluation, ask the user material questions or delegate a question audit before execution.
8. If this is commercial app work, identify applicable readiness lanes and material user decisions before execution.
9. If operational reproducibility applies, identify setup, config, deployment, migrations, manual-step boundaries, and verification strategy.
10. If the ownership audit gate applies, perform or delegate research/evaluation before execution.
11. Create the lightest needed artifact before implementation, including business logic, commercial readiness, operational reproducibility, and ownership recommendations when required.
12. Declare worktree intent if using a task branch or parallel worktree.
13. Proceed only when intent, business logic, readiness, operations, scope, ownership, and verification are clear enough for the chosen route.

## Do Not

- Do not assume the user knows this kit's workflow.
- Do not force the user to decide task size or artifact type.
- Do not read every doc for orientation.
- Do not hand off substantial work without an owner statement or ownership audit.
- Do not edit shared coordination files before checking parallel work.
