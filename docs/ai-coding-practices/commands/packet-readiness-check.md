# /packet-readiness-check

Purpose: review whether a work packet is ready for execution.

Decision owners:
- Routing: `docs/ai-coding-practices/guardrails/request-routing.md`
- Work packet semantics: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`

Use this before handing substantial work to a worker.

## Checks

- no placeholder text remains
- original user intent is preserved separately from interpretation
- business logic, commercial readiness, and operational reproducibility are populated or marked not applicable with reason
- ownership audit names the existing owner or explains why a new owner is needed
- acceptance criteria are observable
- evidence plan names concrete proof categories
- provider setup and manual steps are explicit when integrations or deployment are involved
- critical logic test-quality/mutation gate is run or skipped with reason

## Output

- ready | not ready
- blocking gaps
- assumptions to record
- material user questions

## Do Not

- Do not execute the packet during readiness review.
- Do not ask the user questions the orchestrator can answer by inspecting the repo.
