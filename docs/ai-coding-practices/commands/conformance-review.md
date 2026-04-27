# /conformance-review

Purpose: readiness review before demo, release, large merge, or after a risky change.

Decision owners:
- Work packet semantics: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- QE tooling: `docs/ai-coding-practices/guardrails/qe-tooling.md`
- Commercial app readiness: `docs/ai-coding-practices/guardrails/commercial-app-readiness.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`
- Automation posture: `docs/ai-coding-practices/guardrails/automation-policy.md`

The user does not need to invoke this command. Propose or run it when they ask whether something is ready to ship, merge, demo, submit, or call done.

## Inputs

- relevant work packets
- evaluation findings when available
- critical product/spec docs
- recent git diff/PRs
- test/build results
- manual screenshots or browser checks if UI changed

## Output

- Go / ship with risk / do not ship
- top blockers
- evidence checked
- whether evidence proves intent or only proves implementation details
- whether business/domain rules were confirmed, assumed, or left unproven
- AQE or equivalent QA/QE findings when available
- commercial readiness: demo-ready | beta-ready | launch-ready | not ready
- operational reproducibility: setup/deploy/migrations/config/manual steps/checks status
- packet quality: whether the working doc preserved the original user intent
- ownership drift or duplicate-source risks
- unresolved evaluator findings or retry failures
- unknowns
- smallest next fixes

## Do Not

- Do not mutate TRACKER or work packets automatically.
- Do not create a long report unless there are real findings.
