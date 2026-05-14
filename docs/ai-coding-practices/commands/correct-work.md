# /correct-work

Purpose: execute a focused retry loop from evaluator findings.

Decision owners:

- Work packet semantics: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Model routing: `docs/ai-coding-practices/guardrails/model-routing.md`

Use this when evaluation returns `needs fix` and the issues are clear enough to correct without asking the user.

## Inputs

- source work packet
- evaluator findings
- changed files or diff from the failed attempt
- verification output and evidence from the failed attempt

## Steps

1. Create or read a correction packet.
2. Fix only the named findings.
3. Preserve accepted behavior and ownership boundaries.
4. Return evidence for each finding.
5. Re-run focused regression checks.
6. Send results back for evaluation/orchestrator review.

## Do Not

- Do not use a vague instruction like "address feedback" as the execution source.
- Do not broaden scope, refactor unrelated code, or rewrite accepted behavior.
- Do not ask the user to restate obvious quality gaps already captured by evaluator findings.
- Do not retry the same failed approach after two failed attempts; escalate to the orchestrator.
