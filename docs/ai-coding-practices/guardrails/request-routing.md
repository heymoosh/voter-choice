# Request Routing

The user may not know whether a request is small, large, ambiguous, technically risky, or packet-worthy. The agent owns routing.

## Router

Classify each plain-language request:

- **Question / exploration:** answer or investigate. Do not create a work packet.
- **Tiny mechanical edit:** make the change directly if scope and verification are obvious.
- **Ambiguous implementation request:** ask focused questions before writing code or a work packet.
- **Executable task:** interview briefly, then create one work packet and execute only after the packet is clear.
- **Large / multi-session arc:** interview, create or update a project brief, then create the first work packet.
- **Raw idea for later:** capture it in `.ai/inbox/` only.

Precedence: if a request matches multiple routes, choose the heavier route only when the lighter route cannot preserve intent, ownership, or verification. Large/multi-session arcs outrank executable tasks; executable tasks outrank direct edits; raw ideas are capture-only unless the user asks to act now.

If the user is building for real users, customers, payments, production deployment, or public launch, apply `docs/ai-coding-practices/guardrails/commercial-app-readiness.md` before execution.

If the work creates or changes an app, service, API, deployable artifact, database-backed feature, third-party integration, or provider setup, apply `docs/ai-coding-practices/guardrails/operational-reproducibility.md` before execution.

## Routing Decision Format

For non-trivial requests, briefly expose the routing decision before acting:

```text
Workflow loaded: AGENTS.md + orchestration posture + preflight.
I read this as: <one-sentence intent>.
Routing: <direct edit | work packet | project brief + first packet | capture | answer-only> because <short reason>.
<questions or assumptions>
```

## Interview Rule

Before creating a work packet for non-trivial work, clarify:

- user-visible outcome
- why it matters
- what should not change
- unacceptable shortcuts
- verification evidence
- now vs later

Ask only if the answer changes implementation, data model, UX behavior, privacy/security, scope, or verification. Otherwise state assumptions and proceed.

After the user answers, re-route. Clarification may reveal that the work is a direct edit, a work packet, a project brief, a capture, or not worth doing.

Business-logic questions are material when they affect implementation, data model, UX behavior, access/security, acceptance criteria, or evaluation evidence. Ask the user directly for those. For complex domains, research/evaluation may propose questions, but the orchestrator decides what to ask and records the answer.

Commercial-readiness questions are material when they affect data collection, privacy, access/security, payments, legal/compliance posture, launch readiness, or user trust. Ask concrete decisions only; record assumptions otherwise.

Operational questions are material when they affect provider choice, cost, credentials, billing, external state, deployment, migrations, data retention, rollback, or reproducibility. Prefer source-controlled setup and ask the user only for irreducible account/credential decisions.

## Direct Edit vs Work Packet

Skip project briefs, ownership audits, and evaluator passes for direct edits and tiny mechanical fixes. State the existing owner when useful, make the edit, and run focused verification.

Direct edit is appropriate when all are true:

- change is tiny or mechanical
- intent/scope/verification are obvious
- change is easy to reverse
- no product/data/auth/privacy/architecture judgment is required

Create a work packet when any are true:

- user-visible behavior changes
- business/domain rules may affect behavior or evaluation
- persistence/auth/API/AI/integration behavior changes
- a shortcut could pass while missing intent
- work may be delegated
- change spans multiple files or has unclear verification
- user is describing an outcome rather than a precise edit

Create a project brief only when work spans multiple work packets or sessions and has decisions worth preserving.

## Ownership Audit Gate

Before execution, require an ownership audit when the work changes behavior, spans multiple files/modules/docs, touches business/domain rules, data/state/auth/API/AI/privacy/security/integrations/persistence, introduces a new abstraction/source of truth, or could be completed by duplicating existing logic or docs.

For small contained work, the orchestrator may state the existing owner in one sentence instead of creating a full audit.

Owner: `docs/ai-coding-practices/guardrails/ownership-discipline.md`.
