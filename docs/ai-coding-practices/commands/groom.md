# /groom

Purpose: route raw captures or vague requests into the lightest useful artifact.

Decision owners:
- Routing: `docs/ai-coding-practices/guardrails/request-routing.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Commercial app readiness: `docs/ai-coding-practices/guardrails/commercial-app-readiness.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`

## Steps

1. Read the user request or `.ai/inbox/` item.
2. Follow request routing: restate intent, state route, ask only material questions, re-route after clarification.
3. If business/domain rules may affect implementation or evaluation, capture confirmed rules, assumptions, edge cases, and material open questions.
4. If this is commercial app work, capture readiness target, applicable lanes, assumptions, known risks, and material user decisions.
5. If operational reproducibility applies, capture setup/config/deploy/migration/check strategy and unavoidable manual steps.
6. If the destination is a work packet or project brief and the ownership audit gate applies, research existing owners before writing execution instructions.
7. Write the destination artifact only after ambiguity is resolved.
8. Delete/archive an inbox item only after the destination artifact is written.

## Capture-Specific Rules

- Preserve the user's original wording in the capture history where useful.
- Do not delete an inbox item until the replacement artifact exists.
- Do not execute work during grooming unless the user explicitly shifts to execution and the work packet is ready.
