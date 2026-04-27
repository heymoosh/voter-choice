# Commercial App Readiness

When the user is building something intended for real users, customers, payments, production deployment, or public launch, treat it as commercial app work.

The user should not have to enumerate baseline launch-readiness concerns. The orchestrator owns routing those concerns into work packets, evaluation, correction, or user decisions.

## Readiness Lanes

Consider these lanes when applicable:

- product UX: primary flows, onboarding, empty/loading/error states, final screenshots
- accessibility/responsive: keyboard flow, labels, contrast, desktop/mobile usability
- business logic: user-confirmed rules, edge cases, pricing/plan behavior, limits
- privacy/data: personal data collected, purpose, retention, deletion/export expectations
- auth/access: authentication, authorization, roles, session behavior, least privilege
- payments/subscriptions: provider integration, entitlement rules, refunds/cancellations, webhook reliability
- security baseline: input validation, secret handling, dependency risk, logging without sensitive data
- API/contracts: request/response behavior, error handling, backward compatibility where relevant
- persistence/recovery: canonical storage, reload behavior, backups or recovery assumptions
- observability/support: useful errors, support/admin visibility, incident notes
- deployment/config: environment variables, production build, domain/CORS, deploy target assumptions
- legal/compliance prompt: terms/privacy needs, age/sensitive data, regulated-domain flags

Operational reproducibility is owned by `docs/ai-coding-practices/guardrails/operational-reproducibility.md`. Use it for setup, deployment, provider configuration, migrations, CI/deploy checks, and manual-step minimization.

## User Questions

Ask the user only when the answer materially changes product behavior, data collection, access/security, business rules, payments, legal/compliance posture, or evaluation evidence.

Do not ask the user to design the entire compliance program. Surface concrete decisions and assumptions.

## AQE Use

Use Agentic QE or equivalent QA/QE tooling when available for accessibility, visual/responsive, browser/end-to-end, security-oriented, contract/API, coverage, flaky-test, and test-quality checks.

AQE findings are evidence. The orchestrator still owns final readiness judgment against the user's intent.

## Launch Gate

Before presenting commercial app work as ready, the final review should state:

- readiness lanes checked
- evidence for each applicable lane
- lanes marked not applicable and why
- unresolved risks or user decisions
- whether this is demo-ready, beta-ready, or launch-ready
