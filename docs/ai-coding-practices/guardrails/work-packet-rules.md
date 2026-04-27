# Work Packet Rules

A work packet is the main execution artifact for non-trivial AI coding work.

## Required Contents

- original user intent
- intent interpretation
- business logic when product/domain rules can affect implementation or evaluation
- intent
- scope
- acceptance criteria
- verification
- evidence plan
- anti-solutions
- notes/hints if useful
- ownership audit or explicit owner statement when required by `docs/ai-coding-practices/guardrails/ownership-discipline.md`

Use the template at `docs/ai-coding-practices/templates/work-packet.md`.

## Acceptance Criteria

- AC should be observable and verifiable.
- AC should be embedded in the work packet for ordinary execution tasks.
- Do not rewrite AC during implementation to match what was built.
- If product intent changes, update the source-of-truth or work packet before continuing.
- If an AC can be satisfied by a mock, local state, brittle fixture, or keyword hack, add an anti-solution.
- If verification cannot prove the AC, pause and surface the gap.

## Anti-Solutions

Avoid shortcuts that satisfy wording while missing intent, including:

- local state instead of canonical persistence
- mocks presented as real integrations
- hardcoded demo data presented as production data
- keyword rules where semantic classification is required
- UI-only behavior where data persistence is required
- test-specific hacks that do not generalize

Do not execute from acceptance criteria alone. AC is necessary but not sufficient.

## Evidence Plan

The evidence plan defines what proof must come back from execution. It should name concrete artifacts such as command output, test names, screenshots, browser flows, API responses, database rows, logs, or diff references.

For substantial or delegated work, include:

- visual evidence
- behavior evidence
- business logic evidence
- persistence evidence
- auth/security evidence
- integration evidence
- regression evidence
- proof standard
- non-proof: evidence that is insufficient even if it looks related

If the evidence plan cannot prove the intent or acceptance criteria, pause and surface the gap before treating the work as done.

Do not report verification as complete without naming the command, artifact, or observed behavior. "Tested manually" is not enough.

Business logic evidence should name the rule or edge case, input, expected result, observed result, and proof artifact. If a rule depends on user/domain context that the codebase cannot reveal, the orchestrator should ask the user or explicitly record the assumption before execution.

For user-facing product work, final handoff should include how to run/view it, screenshots or equivalent visual evidence when available, what was verified, what remains unverified, and focused feedback targets for the user.

## Ownership

For substantial work, do not hand execution to a worker until the packet includes the ownership audit or a clear reason the audit was skipped. Execution agents should treat ownership constraints as part of scope.
