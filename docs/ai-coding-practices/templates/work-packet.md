# Work Packet: <slug>

Status: ready
Owner: <orchestrator | worker | reviewer>
Source: TRACKER § <section> — <row>
Branch: <branch-name-if-known>

## Intent

<1-3 sentences: what user/product outcome matters and why.>

## Original User Intent

<Verbatim or lightly cleaned user request. Do not rewrite as implementation tasks.>

## Intent Interpretation

<Orchestrator's interpretation, assumptions, and intended product outcome.>

## Business Logic

Rules:
- <domain/product/business rule that implementation must preserve>

Assumptions:
- <assumption to proceed with if user confirmation is not material>

User-confirmed decisions:
- <decision confirmed by user, or "none">

Edge cases:
- <edge case that must be handled or explicitly deferred>

Out of scope:
- <business rule or policy intentionally not handled in this packet>

## Commercial Readiness

Applicability: <not applicable | demo | beta | launch | paid product>

Lanes in scope:
- <product UX | accessibility/responsive | privacy/data | auth/access | payments/subscriptions | security baseline | API/contracts | persistence/recovery | observability/support | deployment/config | legal/compliance prompt>

User decisions needed:
- <decision or "none">

Assumptions:
- <assumption or "none">

## Operational Reproducibility

Setup:
- <install/init/run commands or "not applicable">

Configuration:
- <.env.example variables, config files, provider IDs, or "not applicable">

Provider setup:
- <automatable by IaC/CLI/MCP? credentials needed? external state changed? repo artifact created?>

Infrastructure/deployment:
- <IaC/deploy config/provider CLI/MCP-backed runbook or "not applicable">

Database migrations:
- <migration path and apply/rollback commands or "not applicable">

Manual steps:
- <none, or smallest unavoidable step with reason>

Verification:
- <local/CI/deploy/smoke checks>

Test quality:
- <mutation testing/test-quality gate for critical logic or reason skipped>

Critical logic trigger:
- <auth/access | payments | pricing/limits | privacy deletion/export | irreversible data transform | security validation | business rule | not applicable>

## Scope

Touch:
- <files/modules/surfaces likely in scope>

Do not touch:
- <explicit non-goals and boundaries>

## Ownership Audit

Concern: <behavior/rule/data/workflow/artifact being changed>
Existing owner: <canonical module/doc/script/source of truth, or "none found">
Neighboring owners:
- <nearby owner and boundary>
Files/modules/docs inspected:
- <path>
Reuse/edit targets:
- <existing owner or approved target to modify>
New owner needed: <no | yes: name owner and boundary>
Overlap/bloat risks:
- <duplicate logic/state/docs/config risk to avoid>
Recommendation: <how execution should proceed>
Execution constraints:
- <what workers must not duplicate or invent>

## Acceptance Criteria

- <observable pass/fail condition>
- <observable pass/fail condition>
- <observable pass/fail condition>

## Verification

- <test/lint/build/browser/manual check required>
- <what evidence should appear in PR/final response>

## Evidence Plan

Visual evidence:
- <screenshots, video, rendered states, or "not applicable">

Behavior evidence:
- <user flow completed, state transition observed, or "not applicable">

Business logic evidence:
- <rule/edge case, input, expected result, observed result, and evidence>

Persistence evidence:
- <reload behavior, DB/API canonical write/read, or "not applicable">

Auth/security evidence:
- <access control, permission, privacy, or security behavior evidence, or "not applicable">

Commercial readiness evidence:
- <readiness lane checked, evidence, risk, or "not applicable">

Operational evidence:
- <setup/deploy/migration/config/CI/smoke/test-quality proof, or "not applicable">

Integration evidence:
- <real service/API path used, mock clearly marked, or "not applicable">

Regression evidence:
- <test/lint/build command output, test name, or "not applicable">

Proof standard:
- <what would convince the orchestrator this satisfies the intent>

Non-proof:
- <evidence that is insufficient, e.g. "component renders" is not enough if persistence is required>

## Anti-Solutions

- <implementation that would technically pass AC but is not acceptable>
- <mock/shim/local-only/test-fixture trap to avoid>

## Notes

<Optional implementation hints. Phrase guesses as hints, not commands.>
