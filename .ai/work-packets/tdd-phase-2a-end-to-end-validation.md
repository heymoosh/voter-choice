# Work Packet: tdd-phase-2a-end-to-end-validation

Status: ready
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 2a (validate the testing discipline catches what it claims to catch)
Branch: launch/production

## Intent

Prove the TDD discipline + Stryker mutation testing **actually catch what they claim to catch** — specifically: (1) when known-tested code is broken, the existing tests detect it; (2) when a hollow test is written for new code, Stryker flags it as insufficient. These are the two failure modes the rollout was designed to prevent. Until we observe them firing on real (controlled) examples, we have configuration but no confidence the discipline works in practice.

## Original User Intent

From the planning session (2026-05-20):

> "What I want to know at a high level is: does our TDD red-green testing suite automation and the enhancements we added with the Stryker mutation testing work end-to-end before we even start developing any additional features or any other enhancements?"

> "Now you mentioned that there are some actual known gaps, so I don't think that we're actually done with this phase until it's completely closed out."

Clarifying refocus a few exchanges later:

> "It is true that we also need to test the GitHub PR/CI integration; however, I'm more concerned about whether or not the testing automation that we have built actually works as intended (the 'red/green TDD' from willison to ensure we don't break new features that have been built, and tests are automated whenever we try to develop something to ensure that we are building what we want to build.)"

## Intent Interpretation

There are two distinct "does it work" questions, and they need different validations:

**Q1 — Does the testing discipline + tools actually catch what they claim to catch?** This is the substantive question. Two specific concerns:
- **Q1a (regression detection):** When existing tested code is broken, do the relevant tests fail with clear signals?
- **Q1b (weak-test detection):** When a hollow test is written for new code, does Stryker flag the test as insufficient?

**Q2 — Does the GitHub PR/CI/branch-protection chain enforce the discipline at merge time?** This is plumbing on top of Q1. If Q1 fails, Q2 is theatre. If Q1 works but Q2 has glitches, we still have a working development discipline locally.

This packet targets Q1 with **two local experiments** that directly demonstrate the failure modes the rollout was built to prevent. Each experiment makes a controlled change to existing code, observes the tooling's response, then reverts the change. No PRs, no CI runs needed — the experiments validate the primitives, and CI is just the automation layer that runs those primitives continuously.

**On Q2:** PR #1 (already open, contains this packet) is the side-channel Q2 validation. It exercises the PR mechanics for the cleanest possible case (docs-only change, no scoped-path touch). Observation of PR #1's gate behavior happens incidentally. If Q1 experiments succeed, PR #1's outcome is a useful additional data point but not the primary evidence.

**What we already have evidence for (don't re-validate):**
- Willison ritual works for NEW code — validated twice already:
  - Subagent A's meta-TDD on `ai-tdd-red.sh` itself (RED → GREEN both captured)
  - Subagent D's alignment notice validation in Phase 1 (5 new tests went RED, then GREEN after implementation)
- The full vitest suite runs to completion (1051 tests pass)
- Stryker installs, runs, produces structured reports (26.90% overall baseline; per-file scores documented)

**The two gaps Phase 2a closes:**
1. We've never observed an existing test catching a deliberate regression
2. We've never observed Stryker catching a deliberately hollow test

## Business Logic

Rules:

- **Experiments are LOCAL.** No PRs, no CI runs needed. Changes are made in the working tree of `launch-production-federal`, observed, and reverted.
- **Experiments revert cleanly.** After each experiment, `git diff` on the affected files must show no changes. Working tree clean.
- **Captured outputs are verbatim.** No paraphrasing of tool output. The exact stderr/stdout from `npx vitest run` and `npx stryker run` go in the Evidence Plan.
- **A failing experiment is a real finding.** If Experiment 1's test doesn't fail when we break the code, that test is hollow — a real Phase 1 follow-up. If Experiment 2's Stryker doesn't flag a hollow test, the tool config is wrong — a real Phase 2 follow-up. Don't paper over failures.
- **The experiments target the files we have confidence in.** Experiment 1 targets `alignment.ts` (which Phase 1 hardened with the Willison ritual). Experiment 2 targets `rate-limit.ts` (which has middling mutation score per the baseline — adding a hollow test there is a fair stress test).
- **No commits to source.** No experimental code is committed. The Evidence Plan captures outputs; the packet documents the result.

Assumptions:

- TDD Phase 1 (commits `5967ced`, `6dfcf38`) and Phase 2 (commit `d0f38ac`) are shipped.
- `scripts/ai-tdd-red.sh`, `scripts/ai-mutation-check.sh`, `stryker.config.json`, `tsconfig.stryker.json` all in place and functional locally.
- The 9 new test cases Subagent D added to `src/lib/server/alignment.test.ts` are present.
- `npx vitest run` and `npx stryker run` work locally without configuration changes.

User-confirmed decisions:

- Drop the four-PR-cycle plan from the prior packet revision. The PR/CI integration validation is Q2 (secondary); the substance is Q1 (primary).
- Two local experiments are the validation: regression detection + hollow-test detection.
- PR #1 remains open as the side-channel Q2 validation (no extra cost; useful data point).
- Phase 2a closes when both experiments produce expected results AND PR #1's gate behavior is observed.

Edge cases:

- **Experiment 1 fails to fail (tests pass despite broken code).** Worst-case finding. The test we wrote in Phase 1 doesn't actually assert what it claims to. Document, surface, schedule a Phase 1 test-strengthening follow-up.
- **Experiment 2 doesn't flag the hollow test (high mutation score despite weak assertion).** Suggests Stryker config is wrong (perhaps the test file is excluded, or the new function isn't in the mutate scope). Document, investigate config, may need Phase 2 follow-up.
- **An experiment surfaces an unrelated bug.** Document but don't fix in this packet — separate concern.
- **Stryker run is slow (5+ minutes).** Expected; one Stryker run per experiment is acceptable.
- **Subagent forgets to revert.** Orchestrator must verify `git status` is clean before declaring packet done.

Out of scope:

- E2E gate validation (Phase 1a, separate)
- The four-PR-cycle plan from the prior revision (dropped in favor of local experiments)
- Strengthening existing tests proactively (let the experiments tell us what's weak)
- Adding new scoped paths to Stryker config
- Changing the mutation threshold
- Modifying any guardrail or AGENTS.md content
- Redesign work

## Commercial Readiness

Applicability: not applicable (meta-validation work — protects future commercial work but isn't commercial itself)

Lanes in scope:

- operational/reliability — proves the safety harness primitives work

User decisions needed:

- none before execution; surface immediately if either experiment produces unexpected results

Assumptions:

- Local execution is sufficient evidence; we don't need CI to re-prove what's already provable locally

## Operational Reproducibility

Setup:

- No new dependencies
- Confirm `git status` is clean on `launch/production` before starting

Configuration:

- No new env vars or config files

Provider setup:

- None — fully local

Infrastructure/deployment:

- None — no CI runs, no deploys, no infrastructure changes

Database migrations:

- not applicable

Manual steps:

- Subagent edits files, runs commands, reverts files. Orchestrator confirms working tree clean after.

Verification:

- Each experiment's expected output observed and captured verbatim
- `git diff` on affected files shows no changes after revert
- `git status --short` shows clean working tree (other than the packet edits themselves)

Test quality:

- This packet is itself a test-of-tests. Quality is observable from the experiment outputs.

Critical logic trigger:

- This packet validates the critical logic gates (test + mutation) actually catch their target failure modes

## Scope

Touch (temporarily, reverted after observation):

- `src/lib/server/alignment.ts` — Experiment 1 breaks one condition; reverted
- `src/lib/server/rate-limit.ts` — Experiment 2 adds a small new function; reverted
- `src/lib/server/rate-limit.test.ts` — Experiment 2 adds a hollow test; reverted

Touch (committed via this packet):

- `.ai/work-packets/tdd-phase-2a-end-to-end-validation.md` — this file (Evidence Plan filled in after execution)

Do not touch:

- Any other file
- Branch protection (already configured)
- Any workflow file
- Other work packets
- Any code under `src/` not listed above
- Stryker config (`stryker.config.json`, `tsconfig.stryker.json`)
- `main` branch

## Ownership Audit

Concern: validation that TDD + Stryker primitives catch what they claim
Existing owner: none for validation specifically
Neighboring owners:

- TDD discipline: `docs/ai-coding-practices/guardrails/test-driven-development.md`
- Mutation testing config: `stryker.config.json`
- Phase 1 + Phase 2 packets (the configuration this packet validates)

Files/modules/docs inspected:

- The packet itself
- Phase 1 + 2 commits (`5967ced`, `d0f38ac`)
- `src/lib/server/alignment.ts` + `.test.ts` (Experiment 1 target)
- `src/lib/server/rate-limit.ts` + `.test.ts` (Experiment 2 target)
- The Stryker baseline report data

Reuse/edit targets:

- After both experiments succeed: update `.ai/project-briefs/tdd-rollout.md` Phase 1 + Phase 2 status to "SHIPPED + VALIDATED end-to-end (Phase 2a)"

New owner needed:

- no — this is one-time validation work

Overlap/bloat risks:

- Experimental changes accidentally committed. Mitigation: subagent reverts after each experiment; orchestrator verifies clean working tree.
- Experiment findings contradicting prior claims. Mitigation: document honestly; weak tests get follow-up packets.

Recommendation:

- Execute experiments in sequence (Experiment 1, then Experiment 2). Document each fully before moving to the next. If either fails, stop and surface — don't proceed to a marketing-claim "Phase 2a complete" while a gap exists.

Execution constraints:

- Subagent MUST revert experimental file changes after each observation
- Subagent MUST capture full verbatim output of `npx vitest run ...` and `npx stryker run`
- Subagent MUST NOT commit experimental code
- Subagent MUST NOT push to any branch
- Orchestrator MUST verify `git status` is clean before declaring packet complete

## Acceptance Criteria

### Experiment 1 — Regression detection (Q1a)

- Deliberately break `attachLimitedDataNotice()` in `src/lib/server/alignment.ts` (specifically: flip `total < LIMITED_DATA_THRESHOLD` to `total > LIMITED_DATA_THRESHOLD`, or remove the function's threshold check entirely, or any change that semantically breaks the limited-data-notice behavior).
- Run `npx vitest run src/lib/server/alignment.test.ts`.
- **Expected:** at least one of the 5 limited-data-notice tests fails with a clear message identifying the broken behavior.
- Capture the failure output verbatim.
- Revert the change. Confirm `git diff src/lib/server/alignment.ts` shows no changes.
- **If tests still pass despite the break:** the test is hollow. Document as a finding; schedule a Phase 1 follow-up to strengthen the test.

### Experiment 2 — Hollow-test detection via Stryker (Q1b)

- Add a small new function to `src/lib/server/rate-limit.ts` (e.g., `function isThrottled(count: number, max: number): boolean { return count >= max; }` — something simple that Stryker can mutate meaningfully).
- Add a deliberately hollow test in `src/lib/server/rate-limit.test.ts` (e.g., `expect(isThrottled(5, 10)).toBeDefined()`).
- Run `npx stryker run`.
- **Expected:** Stryker reports the new function's mutants as Survived (the hollow test doesn't kill them). The file's mutation score drops, and/or the overall score drops below the configured `break` threshold (22%). `npx stryker run` exits non-zero if the gate fires.
- Capture the per-mutant verdict for the new function + the overall score change verbatim.
- Revert both files. Confirm `git diff` on both shows no changes.
- **If Stryker scores the hollow test as fine:** Stryker config is wrong, or the mutate scope doesn't cover the new function. Document; investigate config; may need Phase 2 follow-up.

### System-level proofs

- After both experiments: `git status --short` shows clean working tree (no leftover experimental code).
- Phase 2a packet's Evidence Plan section is filled in with both experiments' captured outputs.
- Project brief updated to mark Phase 1 + Phase 2 as "SHIPPED + VALIDATED end-to-end (Phase 2a, commit `<ref>`)".
- If both experiments produced expected results: TDD rollout discipline is *empirically* validated, not just configured.

## Test Plan

This packet's "tests" are the experiments themselves. Each experiment is a controlled stress test of the discipline.

| AC | Test artifact | Test shape |
|---|---|---|
| Q1a — regression detection works | Experiment 1: `src/lib/server/alignment.ts` (broken) + `npx vitest run src/lib/server/alignment.test.ts` | semantically broken impl → test suite reports >= 1 failure with clear message identifying the regression |
| Q1b — hollow-test detection works | Experiment 2: `src/lib/server/rate-limit.ts` (new function + hollow test) + `npx stryker run` | hollow test on new code → Stryker flags survived mutants; overall score drops below threshold; stryker exits non-zero |
| Reverts are clean | `git diff` after each experiment | no diff on the affected source/test files |
| Working tree clean at end | `git status --short` | only this packet's Evidence Plan edits show as modified |

### Execution ritual for this packet

The validation IS the test. Each experiment is a self-contained mini-cycle:

1. Read current state of the target file
2. Make the deliberate change (break code OR add hollow test)
3. Run the relevant tool (`npx vitest run <file>` OR `npx stryker run`)
4. Capture full verbatim output
5. Revert the file(s) via `git checkout <file>` (or restore from a saved-content snapshot if needed)
6. Confirm `git diff <file>` shows no changes
7. Move to next experiment

Subagent runs the experiments in sequence, orchestrator verifies clean working tree after, then updates this packet's Evidence Plan with captured outputs.

## Evidence Plan

> Filled in after execution. Below is the placeholder structure.

### Experiment 1 — Regression detection

- **Change applied:** `<diff snippet showing the deliberate break>`
- **Command run:** `npx vitest run src/lib/server/alignment.test.ts`
- **Captured output:** `<verbatim, including test names and failure messages>`
- **Tests that failed:** `<list>`
- **Tests that passed despite the break (if any):** `<list>` — these are weak tests worth strengthening
- **Revert verified:** `git diff src/lib/server/alignment.ts` returned no output
- **Verdict:** PASS / FAIL — regression detection works as claimed: yes/no
- **Follow-ups (if any):** `<reference any tests that passed despite the break — schedule strengthening>`

### Experiment 2 — Hollow-test detection

- **Change applied:** `<diff snippets for both rate-limit.ts and rate-limit.test.ts>`
- **Command run:** `npx stryker run`
- **Captured output (summary section):** `<verbatim>`
- **Per-mutant verdict for new function:** `<list of mutants on isThrottled (or chosen name), each marked Killed/Survived/NoCoverage>`
- **Overall score change:** baseline 26.90% → with hollow test: `<X>%`
- **Stryker exit code:** `<0 or non-zero>`
- **Threshold gate fired:** yes/no
- **Reverts verified:** both files show no diff
- **Verdict:** PASS / FAIL — hollow-test detection works as claimed: yes/no
- **Follow-ups (if any):** `<config investigation if Stryker missed the hollow test>`

### Q2 side-channel observation — PR #1 mechanics

- **PR #1 URL:** https://github.com/heymoosh/voter-choice/pull/1
- **`test` job triggered:** yes/no
- **`mutation` job triggered (should be SKIPPED due to path filter):** yes/no
- **`test` job result:** pass/fail
- **Merge button enabled when expected:** yes/no
- **PR merged via UI (no admin override):** yes/no
- **Notes:** `<anything unexpected>`

### Synthesis

- Q1a (regression detection): PASS / FAIL
- Q1b (hollow-test detection): PASS / FAIL
- Q2 (PR mechanics): PASS / FAIL / Not yet observed
- Overall verdict: TDD rollout discipline is empirically validated: yes/partial/no
- Outstanding gaps: `<list>`
- Next steps: `<typically: proceed to Phase 1a, or schedule remediation packets>`

## Anti-Solutions

- Do NOT skip reverting the experimental changes — leaving broken code in the working tree pollutes future work
- Do NOT capture only the "happy" output — if an experiment produces an unexpected result, that IS the finding and must be documented as-is
- Do NOT add `.skip()` to the tests in Experiment 1 to make them pass — the test must fail if the code is broken; that's the whole point
- Do NOT modify the Stryker config to exclude the new file in Experiment 2 — same reason
- Do NOT commit experimental code on any branch
- Do NOT push experimental code to any remote
- Do NOT declare Phase 2a complete unless both experiments PASSED with their expected outcomes, OR the failure modes are documented as follow-up packets

## Notes

**Why local experiments instead of the four-PR plan from the prior packet revision:** the user clarified that the substantive concern is whether the testing discipline catches what it claims (Q1), not whether the GitHub PR/CI plumbing enforces it at merge time (Q2). Q1 is the substance; Q2 is plumbing. Q1 can be validated in 10-15 minutes locally; the prior four-PR plan would have taken hours of CI time and PR-mechanics observation while only weakly addressing Q1. PR #1 (already open) covers the Q2 happy-path incidentally.

**Sequencing relative to other queued work:** Phase 2a must land before Phase 1a (e2e CI compat) and before redesign Phase 1. Reasons:
- Redesign work depends on the gates catching mistakes. If the gates don't catch what they claim, every redesign packet is at risk
- Phase 1a's success is itself a gate-validation exercise (does fixing e2e make the e2e job pass in CI?); having Phase 2a validate the core gates first means we're isolating "is this CI environment-stable" from "do the gates fire correctly"

**The "should pass" PR from the prior revision** (test-strengthening for a survived mutant via Willison ritual) is dropped from this packet's scope but remains a worthy follow-up. After Phase 2a confirms the gates work, a small follow-up packet can strengthen one or more tests for survived mutants — that's a real test-quality improvement that's orthogonal to the validation.

**Findings from Experiment 1 are the most important.** If `alignment.test.ts` doesn't catch a deliberate regression in `alignment.ts`, then Phase 1's validation work wrote weak tests AND the Willison ritual didn't prevent it. That'd be a serious finding — the ritual would need refinement. Worth taking seriously.

**Findings from Experiment 2 are config-confirming.** Stryker's purpose is exactly to catch hollow tests, so this should pass. If it doesn't, the config is wrong.

**After Phase 2a passes:** brief gets updated, Phase 1a is groomed, redesign work can start with empirical confidence in the discipline.
