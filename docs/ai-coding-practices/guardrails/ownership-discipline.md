# Ownership Discipline

Use MECE ownership to prevent codebase and docs drift:

- Mutually exclusive: each durable behavior, rule, data source, workflow, artifact, or abstraction has one owner.
- Collectively exhaustive: the owner set covers the concern space with no important gaps.

The goal is not ceremony. The goal is to avoid parallel sources of truth, duplicate implementations, and unowned gaps.

## Workflow Ownership

- The orchestrator owns request interpretation, routing, work packet readiness, and final integration review.
- Research/evaluation owns the ownership audit and recommendation when the request is substantial.
- Work packets own execution truth for bounded work.
- Execution agents own implementation inside packet boundaries.
- The orchestrator owns final verification against intent, acceptance criteria, anti-solutions, and ownership constraints.

## Ownership Audit Gate

Require an ownership audit before execution when work:

- changes user-visible behavior
- spans multiple files/modules/docs
- touches data, state, auth, API, AI, privacy, security, integrations, or persistence
- introduces or changes an abstraction, command, workflow, config, schema, source of truth, or durable rule
- could be completed by duplicating existing logic, docs, scripts, or state
- is part of a multi-session project arc

Skip the full audit for answer-only requests, raw captures, tiny mechanical edits, or narrow fixes where the owner is obvious. The orchestrator may still state the owner in one sentence.

## Ownership Audit

For substantial work, research/evaluation should inspect the relevant codebase/docs context and write recommendations into the work packet or project brief before execution starts.

Use this shape:

```md
## Ownership Audit

Concern:
Existing owner:
Neighboring owners:
Files/modules/docs inspected:
Reuse/edit targets:
New owner needed:
Boundaries:
Overlap/bloat risks:
Recommendation:
Execution constraints:
```

## Execution Boundary Check

Execution agents should not rerun the full ownership audit. They should read the audit and do a small boundary check before editing:

- Am I editing the stated owner or approved target?
- Am I creating a parallel owner, duplicate source of truth, or overlapping helper?
- Did implementation reveal that the audit is wrong or incomplete?

If the audit is wrong or incomplete, stop and report the mismatch to the orchestrator instead of inventing a parallel path.

## Adding New Owners

Add a new owner only when the concern is genuinely uncovered. When adding one:

- name what it owns
- name what it does not own
- update the relevant source-of-truth map, project brief, template, index, tests, or docs
- remove, redirect, or explicitly mark overlapping old paths as temporary risk

## Anti-Patterns

- adding a helper before finding the existing helper
- duplicating validation, state, config, commands, or docs near the new feature
- creating a new doc because the existing owner is harder to edit
- treating acceptance criteria as the whole truth
- leaving two places that future agents would reasonably update for the same concern
