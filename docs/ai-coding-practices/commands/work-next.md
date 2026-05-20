# /work-next

Purpose: execute one ready work packet or correction packet.

Decision owners:

- Routing: `docs/ai-coding-practices/guardrails/request-routing.md`
- Work packet rules: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Test-driven development: `docs/ai-coding-practices/guardrails/test-driven-development.md`

The user does not need to invoke this command. Use it internally when a ready work packet/correction packet already exists or after the agent has just created one.

## Steps

1. Read the selected ready work packet or correction packet.
2. Restate intent and scope briefly.
3. Read the ownership audit or explicit owner statement when present.
4. Do a lightweight boundary check: edit the stated owner/target, avoid parallel sources of truth, and stop if the audit is wrong or incomplete.
5. Confirm only if ambiguity remains.
6. Create/use a branch or worktree as appropriate.
7. For each acceptance criterion: write the test first, run `bash scripts/ai-tdd-red.sh <test-file>` to confirm the red phase, capture the failure output as evidence, then implement. Skipping the red phase is not allowed. See `docs/ai-coding-practices/guardrails/test-driven-development.md`.
8. Implement within scope.
9. Verify acceptance criteria, anti-solutions, ownership constraints, and evidence plan.
10. Return changed files, named verification output, evidence artifacts, unverified risks, and finding-to-change mapping for correction work.
11. Open a PR or provide a final summary with changed files and evidence when no separate PR flow exists.

## Do Not

- Do not execute raw inbox items.
- Do not execute from AC alone.
- Do not execute vague evaluator feedback; require a correction packet or fixable finding list.
- Do not create a parallel owner when the work packet names an existing owner.
- Do not rerun broad ownership research unless implementation reveals the packet is wrong or incomplete.
- Do not mark substantial delegated work done without returning evidence for evaluator/orchestrator review.
- Do not say verification is complete without naming the command, artifact, or observed behavior.
- Do not substitute visual evidence for required business logic, auth/security, persistence, or integration evidence.
- Do not broaden correction work beyond named findings.
- If AC conflicts with original user intent or business logic, stop and report the mismatch.
- Do not batch unrelated work packets.
- Do not edit TRACKER completion state from unattended automation.
