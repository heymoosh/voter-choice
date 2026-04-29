# Work Packet: launch-publish-readiness

Status: completed
Owner: orchestrator
Source: User request — publish `launch/production`
Branch: launch/production

## Intent

Prepare the launch branch for live Vercel publication by aligning privacy posture, E2E coverage, and durable safeguard provisioning with the actual MVP voter journey.

## Original User Intent

Ensure users can visit the live Vercel URL and use the app like real voters, make the privacy posture clear, and implement the Terraform-backed Upstash provisioning path.

## Intent Interpretation

Treat this as launch readiness work: fix stale test expectations, improve user-facing privacy truth, and add a reproducible provisioning path for durable budget/rate-limit counters without requiring dashboard copy/paste.

## Business Logic

Rules:

- Do not claim we control Google, Anthropic, Vercel, GitHub, Upstash, or other provider disclosure.
- Do state that the app does not create or store a combined record of address plus chat content.
- Live launch may proceed before Redis is configured, but broader public traffic should still configure durable safeguards.
- Upstash primary region defaults to `us-west-1` per owner decision.

Assumptions:

- Terraform/OpenTofu can be installed by the operator when running the provisioning script.
- GitHub Actions remains the canonical path for syncing secrets into Vercel during deploy.

User-confirmed decisions:

- Publish means code + deploy + live smoke.
- One real Anthropic chat turn is part of live smoke.
- Redis is deferred as a hard launch gate, but provisioning should be repo-ready.

## Scope

Touch:

- Privacy page and in-flow privacy notices
- E2E tests for current launch UX
- Upstash Terraform files and provisioning script
- README and env example

Do not touch:

- Provider credentials
- Branch switching
- Main branch

## Acceptance Criteria

- Privacy page states the app does not store a combined record of who said what and where they live.
- E2E tests match the current research workspace instead of stale state-card expectations.
- Home footer includes legal owner and data-updated text expected by launch checks.
- Upstash provisioning is source-controlled with default region `us-west-1`.
- Provisioning script prompts for missing credentials and stores Upstash REST secrets in GitHub Actions.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `bash scripts/ai-preflight.sh`

## Anti-Solutions

- Do not overpromise immunity from provider or infrastructure disclosures.
- Do not commit Terraform state, `.tfvars`, or secrets.
- Do not require users to manually copy Redis REST credentials from a dashboard when CLI/IaC can extract them.
