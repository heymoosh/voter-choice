# Drift Watch

Use this compact failure-pattern watchlist during orchestration, evaluation, correction, and final review.

The orchestrator owns this watchlist. Do not make every worker rerun it in full. Workers should use the relevant packet constraints and stop when they see a mismatch.

## Always Watch For

- workflow not loaded: first routed response lacks `Workflow loaded: AGENTS.md + orchestration posture + preflight`
- AQE/MCP unavailable when QA/QE lanes require it
- original user intent missing, rewritten, or replaced by implementation tasks
- packet drift: packet misses user intent or adds unsupported scope
- process mismatch: heavy workflow applied to tiny direct edits, or lightweight route used for risky work
- evidence gap: claims without command, artifact, screenshot, browser observation, log, API response, or DB proof
- shallow packet sections: placeholder text, vague business logic, vague evidence plan, or unexplained `not applicable`
- user-question mismatch: asking tool choices the agent should research, or failing to ask material product/business/privacy/provider questions
- provider/manual setup drift: dashboard steps not encoded as IaC, CLI, MCP-backed runbook, config, or documented irreducible manual step
- security/privacy overclaim: hygiene checked is not legal/compliance certification
- critical-logic test gap: mutation/test-quality gate missing or skipped without reason
- visual-only proof used for business logic, persistence, auth/security, integration, or operational behavior
- AQE overreach: AQE findings treated as product intent or final acceptance
- long-project context drift: project brief/work packets/evaluations/corrections not updated after material decisions
- correction drift: worker fixes outside named findings or cannot map changes to finding IDs

## Orchestrator Response

When a drift pattern appears:

1. Fix internally if it is a routine quality gap.
2. Create or update the relevant packet/evaluation/correction artifact.
3. Ask the user only if the issue changes product behavior, business logic, privacy/security, provider/cost, scope, or launch posture.
4. Name unresolved drift in final review if it remains.
