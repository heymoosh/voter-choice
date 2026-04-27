# /evaluate-work

Purpose: evaluate whether completed execution achieved the intended outcome.

Decision owners:
- Work packet semantics: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- QE tooling: `docs/ai-coding-practices/guardrails/qe-tooling.md`
- Commercial app readiness: `docs/ai-coding-practices/guardrails/commercial-app-readiness.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`
- Model routing: `docs/ai-coding-practices/guardrails/model-routing.md`

Use this after substantial, delegated, risky, user-visible, or release/demo/merge-bound work. The evaluator recommends accept/fix/uncertain; the orchestrator makes the final intent judgment.

## Inputs

- original work packet or project brief
- execution summary
- changed files or diff
- test/build/lint output
- screenshots, logs, API responses, database evidence, or manual check notes when relevant
- known risks or unverified areas from the worker

## Tooling

Use Agentic QE when it is already available for obvious QA/QE lanes: accessibility, visual/responsive review, browser/end-to-end flows, coverage gaps, test quality, flaky tests, API/contract checks, and security-oriented checks.

If AQE is unavailable, continue with project-native checks and name the gap. Do not let AQE replace the work packet, original user intent, business rules, or orchestrator final judgment.

## Output

- recommendation: accept | needs fix | uncertain
- intent alignment: aligned | partially aligned | not aligned
- packet quality: sufficient | incomplete | misleading
- intent source checked: original user intent | intent interpretation | acceptance criteria
- packet drift: none | packet missed user intent | packet added unsupported scope
- evidence checked
- intent/acceptance mismatches
- business-logic mismatches or missing domain proof
- commercial-readiness gaps, risks, or unproven lanes
- operational-reproducibility gaps: setup, config, deploy, migrations, manual steps, CI/deploy checks, or test quality
- missing or weak proof
- anti-solution or shortcut risks
- ownership drift or duplicate-source risks
- fixable findings with severity, source, observed, expected, required correction, and evidence required
- smallest follow-up fixes

## Finding Format

```md
### F<n>: <short title>

Severity: blocker | major | minor
Source: <AC/evidence/business rule/ownership constraint>
Observed: <what failed or was missing>
Expected: <what should happen>
Required correction: <specific fix outcome>
Evidence required: <command, artifact, screenshot, API response, DB proof, or observed behavior>
```

Return `uncertain` when packet drift exists or the packet does not preserve the original user intent.

## Do Not

- Do not mutate TRACKER, work packets, project briefs, or acceptance criteria automatically.
- Do not treat test pass as sufficient if the evidence plan requires user-visible, persistence, integration, or ownership proof.
- Do not treat visual evidence as sufficient for business logic, auth/security, persistence, integration, or regression behavior.
- Do not grade only against the packet. Check whether the packet preserved the original user intent.
- Do not invent business rules when domain context is missing; return the gap to the orchestrator.
- Do not return vague feedback. Findings must be specific enough to become a correction packet.
- Do not become the final authority on user intent; return findings to the orchestrator.
