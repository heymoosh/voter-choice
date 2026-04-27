# Model Routing

Use stronger models for judgment and cheaper/faster models for bounded execution.

The user should not have to pick models or agent roles. The orchestrator owns routing unless the user explicitly specifies a model.

## Orchestrator

Use the strongest reasoning model available for:

- product intent
- business/domain rule discovery
- commercial app readiness judgment
- operational reproducibility and provider setup judgment
- request routing and work packet readiness
- ownership audits and MECE recommendations
- architecture
- data model decisions
- integration uncertainty
- reviewing worker output
- challenging whether a plan is overbuilt
- deciding whether to ask questions, create a work packet, or proceed directly

For non-trivial work, the orchestrator should not be the default execution agent. It should route, preserve the working doc, delegate bounded execution when useful, and review integration.

## Research / Evaluation

Use a strong reasoning model before execution when ownership, architecture, data/state, integrations, or source-of-truth boundaries are unclear.

Research/evaluation should:

- inspect relevant existing owners and neighboring owners
- inspect existing domain/business rules in code/docs
- identify reuse/edit targets
- propose material business-logic questions for the orchestrator when code/docs cannot answer them
- name overlap or bloat risks
- recommend whether to edit an existing owner or add a new one
- write the recommendation into the work packet or project brief

Do not delegate implementation to research/evaluation unless the orchestrator explicitly re-routes the task.

## Worker

Use a faster/cheaper coding model for:

- bounded implementation from a clear work packet
- mechanical edits
- test additions
- small bug fixes
- docs updates with clear source material

## Evaluator

Use a strong or medium reasoning model after execution when proof matters:

- substantial delegated work
- user-visible behavior changes
- risky data/state/auth/API/AI/integration/persistence changes
- real-user, paid, production, or public-launch readiness
- setup/deploy/config/migration/provider automation is unclear
- complex verification or manual evidence
- release, demo, merge, or submission readiness

The evaluator checks evidence against the work packet intent, acceptance criteria, anti-solutions, ownership constraints, and evidence plan. The evaluator recommends accept, needs fix, or uncertain. The orchestrator remains the final authority on whether the work satisfies the user's intent.

For business/domain behavior, the evaluator should check the named rule, input, expected result, observed result, and proof artifact. The evaluator may flag missing domain context, but should not invent final business rules.

When available, evaluators should use Agentic QE tooling for obvious QA/QE lanes such as accessibility, visual/responsive checks, browser/end-to-end verification, coverage gaps, test quality, flaky tests, API/contract checks, and security-oriented checks. AQE findings are evidence, not final product judgment.

## Escalate When

- product meaning is ambiguous
- the change cuts across many modules
- verification is unclear
- the worker fails twice
- the task involves privacy/security judgment
- the implementation would introduce a new abstraction or data model

## Delegation Packet

Every worker should receive:

- one work packet
- ownership audit or explicit owner statement when required
- owned files/modules
- explicit non-goals
- evidence plan
- verification required
- instruction not to revert unrelated changes

Every evaluator should receive:

- original work packet or project brief
- execution summary
- changed files or diff
- verification output and artifacts
- known risks or unverified areas
- packet drift status and intent sources checked

## Retry Routing

Use the same worker for a retry when the evaluator findings are local, clear, and the first attempt was close.

Use a different worker or orchestrator intervention when:

- the same finding fails twice
- the fix touches ownership/business logic not in the packet
- the evaluator says the packet was incomplete or misleading
- the worker cannot reproduce or disputes the finding
- the correction would expand scope

## Do Not

- Do not ask the user to choose the model unless cost/latency tradeoff is material.
- Do not delegate ambiguous product intent to a worker.
- Do not ask a worker to rediscover broad ownership context that should be in the work packet.
- Do not let the worker be the only judge of whether substantial work is done.
- Do not let evaluator findings override user intent without orchestrator review.
- Do not send vague "address feedback" instructions to workers; create a correction packet or fixable finding list.
- Do not use worker output as final without orchestrator review.
