# QE Tooling

Use external quality-engineering tools to reduce manual QA burden, not to replace orchestration or product judgment.

## Agentic QE

Agentic QE (`agentic-qe`) is an approved optional evaluator tool when available in the environment.

Use AQE from evaluation, conformance review, and correction flows for:

- accessibility checks
- visual and responsive web-app review
- browser/end-to-end flow verification
- test generation and coverage-gap analysis
- flaky-test investigation
- API/contract testing
- security-oriented checks
- quality gates for hollow or weak generated tests

## Boundaries

AQE must not own:

- user intent
- orchestration posture
- work packet semantics
- business/domain rules
- acceptance criteria
- final accept/reject judgment

The orchestrator owns intent and final acceptance. AQE findings are evaluator evidence that can produce fixable findings or correction packets.

## When Unavailable

If AQE tools are unavailable, the evaluator should use existing project commands and browser/manual checks. Do not block ordinary work solely because AQE is not installed or MCP is not available. Name the gap in the evidence plan or final review.

## Setup Boundary

Do not run `aqe init --auto` unattended in this repo. The kit owns `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, and `.codex/config.toml`; broad AQE init may overwrite or duplicate those sources of truth.
