# Operational Reproducibility

Anything required to run, deploy, migrate, configure, or verify the system should live in the repo when practical.

Manual setup is a last resort. If unavoidable, document the smallest required manual step and why it cannot be automated.

## Applies When

Apply this guardrail to any:

- app, service, API, CLI, or deployable artifact
- database-backed feature
- third-party integration
- auth/payment/storage/messaging/search/AI provider setup
- CI, deployment, or environment configuration
- business-critical, security-sensitive, payment, access-control, or data-transformation logic

## Preferred Order

For external services and infrastructure, prefer:

1. official Infrastructure as Code or provider config checked into repo
2. provider CLI scripts checked into repo
3. MCP tools when they are safer or more complete than raw CLI/API use
4. documented commands with explicit environment variables
5. manual dashboard steps only when unavoidable

MCPs can be useful for provider setup and inspection, but they do not replace source-controlled configuration. If an MCP changes provider state, capture the resulting desired state, commands, config, or runbook in the repo.

## Required Concerns

For applicable work, define:

- setup: commands to install, initialize, and run locally
- configuration: `.env.example`, required variables, config files, provider IDs
- infrastructure/deployment: IaC, deploy config, CI/CD workflow, or provider CLI script
- database migrations: versioned migration files and apply/rollback commands
- manual steps: none, or the irreducible step and reason
- verification: local, CI, deploy, and smoke checks
- test quality: mutation testing or equivalent for critical logic, or reason skipped
- provider setup: whether setup is automated by IaC, CLI, MCP, documented command, or unavoidable manual step

## Checks

Pre-commit, CI, and deployment checks should overlap enough that agents cannot pass locally while failing during deploy.

For critical logic, consider mutation testing or a test-quality gate. Use it especially for:

- auth/access control
- payments/subscriptions
- pricing/limits/entitlements
- privacy/data deletion/export behavior
- business rules
- security-sensitive validation
- irreversible data transformations

If a critical-logic trigger applies, evaluation must report: mutation/test-quality gate run, skipped with reason, or unavailable.

## User Escalation

Ask the user only for:

- credentials, billing, account ownership, or legal acceptance
- provider choice when it materially affects cost, privacy, lock-in, or operations
- business/product decisions that change behavior
- permission to run tools that modify external provider state
