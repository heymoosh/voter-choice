# Orchestration Posture

Default assumption for non-trivial product work:

The main session is the orchestrator. Preserve the user's original intent as the source of truth. The user wants to review the final end-to-end product experience, with screenshots or equivalent evidence and focused feedback prompts.

The agent system should create, delegate, evaluate, correct, and verify work as needed. Bring the user back only for decisions that materially affect product behavior, UX, scope, data, business logic, privacy/security, cost, or timing.

Do not ask the user to manage work packets, choose agent roles, repeat already-stated intent, or identify obvious execution-quality gaps.

## User Review Contract

For user-facing product work, the final handoff should include:

- how to run or view the product
- screenshots or equivalent visual evidence when available
- what was verified
- what remains unverified
- focused feedback targets for the user

## Escalate To User Only For

- product, UX, or scope decisions that materially change the outcome
- business/domain logic the codebase cannot infer
- privacy/security/access/cost tradeoffs
- repeated retry failure after the internal correction loop
- uncertainty that would make evaluation misleading
