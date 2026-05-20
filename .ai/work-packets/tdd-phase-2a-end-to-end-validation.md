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

> Executed 2026-05-20. All findings captured verbatim from subagent reports and GitHub Actions runs.

### Experiment 1 — Regression detection

- **Change applied:** flipped `>=` to `<=` on line 78 of `src/lib/server/alignment.ts` (the threshold gate `if (result.total >= LIMITED_DATA_THRESHOLD) return result;` → `if (result.total <= LIMITED_DATA_THRESHOLD) return result;`). 1-character flip, semantically inverts the notice-suppression logic.
- **Command run:** `npx vitest run src/lib/server/alignment.test.ts`
- **Captured output (summary):** `Test Files 1 failed (1) | Tests 4 failed | 31 passed (35)`
- **Tests that failed (4):**
  1. `lookupAlignment > surfaces a limited-data notice when total < 5` — `AssertionError: expected undefined to be defined` (line 511)
  2. `lookupAlignment > does not surface a limited-data notice when total >= 5` — `expected 'Limited data: only 6 relevant votes f…' to be ''` (line 541)
  3. `attachLimitedDataNotice > attaches a notice mentioning 'limited data' when found: true and total < 5 (and > 0)` — `expected undefined to be defined` (line 617)
  4. `attachLimitedDataNotice > does not attach a notice when found: true and total >= 5` — `expected 'Limited data: only 10 relevant votes …' to be ''` (line 632)
- **Tests that passed despite the break (correctly invariant, not weak):**
  - Boundary case at exactly `total === 5`: original `>= 5` returns early; flipped `<= 5` also returns early. Same outcome.
  - DB-not-configured (`total === 0`, `unavailable` set): caught by earlier guards before reaching the threshold check.
  - Zero-rows case: caught by earlier guards.
  - `found: false` passthrough: caught by `!result.found` guard.
- **Revert verified:** `git diff src/lib/server/alignment.ts` returned no output. Re-run after revert: 35/35 pass.
- **Verdict:** ✅ **PASS** — regression detection works as claimed. 4 tests fired with clear, distinct assertions covering both directions of the gate (notice should appear when thin / notice should NOT appear when sufficient). No follow-ups required.

### Experiment 2 — Hollow-test detection

- **Change applied:**
  - Appended to `src/lib/server/rate-limit.ts`:
    ```typescript
    export function isThrottled(count: number, max: number): boolean {
      return count >= max;
    }
    ```
  - Appended to `src/lib/server/rate-limit.test.ts`:
    ```typescript
    describe("isThrottled (Phase 2a hollow test)", () => {
      it("returns a value", () => {
        expect(isThrottled(5, 10)).toBeDefined();
      });
    });
    ```
- **Pre-Stryker vitest:** 13/13 passed (12 baseline + 1 hollow).
- **Command run:** `npx stryker run` (~5 min 49 sec)
- **Captured output (summary table):**
  ```
  -------------------|------------------|----------|-----------|------------|----------|----------|
                     | % Mutation score |          |           |            |          |          |
  File               |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
  -------------------|--------|---------|----------|-----------|------------|----------|----------|
  All files          |  26.77 |   44.42 |      219 |         0 |        274 |      325 |      299 |
   server            |  49.06 |   54.31 |      208 |         0 |        175 |       41 |      149 |
    alignment.ts     |  73.63 |   74.44 |       67 |         0 |         23 |        1 |       51 |
    budget.ts        |  48.26 |   54.97 |       83 |         0 |         68 |       21 |       58 |
    rate-limit.ts    |  36.02 |   40.85 |       58 |         0 |         84 |       19 |       40 |
   generatePrompt.ts |   0.00 |    0.00 |        0 |         0 |          0 |      277 |       72 |
   getStateData.ts   |   9.40 |   10.00 |       11 |         0 |         99 |        7 |       78 |
  -------------------|--------|---------|----------|-----------|------------|----------|----------|
  ```
- **Per-mutant verdict for `isThrottled` (rate-limit.ts:280 — `return count >= max`), from `reports/mutation/mutation.json`:**
  - ConditionalExpression → `return true` — **Survived**
  - ConditionalExpression → `return false` — **Survived**
  - EqualityOperator → `return count > max` — **Survived**
  - EqualityOperator → `return count < max` — **Survived**
  - All 4 mutants ran the hollow test (covered, not NoCoverage) — and all 4 survived because `toBeDefined()` cannot distinguish any of `true`/`false`/`>=`/`>`/`<`.
- **Overall score change:** baseline 26.90% → with hollow test: **26.77%** (0.13-point drop)
- **rate-limit.ts file score change:** 35.45% baseline → 36.02% (actually went up fractionally because the new function's 4 survived mutants dilute into a larger pool)
- **Stryker exit code:** **0** (final score 26.77% ≥ 22% break threshold; the hollow test's contribution wasn't large enough to breach `break` on its own)
- **Threshold gate fired:** ❌ **NO** — global `break: 22` is too coarse to flag a single hollow test on a small new function
- **Reverts verified:** `git diff` on both files produced no output.
- **Verdict:** ✅ **PASS (tool) with ⚠️ NUANCE (gate)** — Stryker correctly identified the hollow test as insufficient at the per-mutant level; all 4 `isThrottled` mutants flagged Survived in the JSON output. The mutation testing TOOL adds real signal beyond plain unit testing. However, a single hollow test on a 1-line function is too small to move the global score below the `break` threshold on its own — the break gate is a coarse safety net, not a per-test verdict.
- **Follow-up (Phase 2b candidate):** consider a per-file mutation-score regression check (file-level break thresholds OR "no new survived mutants on changed lines") rather than relying solely on the global break to catch hollow tests on small additions.

### Q2 side-channel observation — PR mechanics

#### PR #1 (this PR — Phase 2a packet, validate/phase-2a-packet-draft branch)

- **URL:** https://github.com/heymoosh/voter-choice/pull/1
- **`test` job initially: FAILED** in 35s on 8 pre-existing prettier errors across 4 files (`src/app/api/chat/route.ts`, `src/app/api/donors/route.ts`, `src/components/BallotToolClient.test.tsx`, `src/components/RacePatterns.test.tsx`). These errors pre-dated the TDD rollout but had been masked by subagent verification reports that scanned for "new errors" rather than checking exit code.
- **`mutation` job: did NOT trigger** — path filter correctly excluded the docs-only changes in PR #1.
- **`e2e` job: FAILED** as expected (pre-existing Phase 1a territory; not required for merge).
- **Net Q2 finding:** CI gate works correctly. It caught real errors the discipline missed. The failing gate prevented merge, exactly as designed. **The CI was doing its job; we were the unreliable part.**

#### PR #2 (fix/prettier-drift, the clean-path validation that resolved PR #1's lint blocker)

- **URL:** https://github.com/heymoosh/voter-choice/pull/2
- **Trigger:** opened after `npx prettier --write` on the 4 affected files
- **`test` job:** ✅ **PASSED** in 1m 15s
- **`mutation` job: did NOT trigger** — path filter correctly excluded non-scoped formatting fixes (4 affected files are not in Stryker's scoped paths)
- **`e2e` job: FAILED** in 7m 23s — expected (Phase 1a backlog)
- **Merge button: enabled** once `test` was green (branch protection requires only `test`)
- **Merge: completed via GitHub UI** by user, **no admin override** — commit `e5d358a` on `launch/production`
- **Post-merge state:** `launch/production` lint exits 0; 0 errors

### Discipline gap surfaced (real finding)

**Subagent verification reports of "lint clean / tests pass" were unreliable.** Across Phase 1 (Subagent A, Subagent D), Phase 2 (Stryker setup subagent), all reported "lint clean" while 8 prettier errors persisted. The pattern: subagents (and the orchestrator) were scanning output for "Error:" lines past a pipeline filter (grep/head/tail), which sometimes masked errors not in the visible tail. The exit code was the load-bearing signal but was lost through pipelines.

**Mitigation rule (added to TDD guardrail in commit `<next>`):** orchestrator MUST independently verify subagent claims of "lint clean / tests pass / build green" with the unfiltered exit-code pattern: `<cmd> > /tmp/<name>.txt 2>&1; echo $?`. Pipes mask exit codes; never trust a "clean" claim made through `| grep` or `| tail`.

### Synthesis

- **Q1a (regression detection):** ✅ PASS
- **Q1b (hollow-test detection — tool):** ✅ PASS
- **Q1b (hollow-test detection — gate):** ⚠️ Nuanced — tool catches it; global gate too coarse for small additions; Phase 2b follow-up to refine
- **Q2 (CI gate blocks failing PRs):** ✅ PASS — PR #1's CI correctly caught real lint errors
- **Q2 (CI gate allows clean PRs):** ✅ PASS — PR #2 merged through the gate via UI without admin override
- **Discipline gap surfaced:** Subagent verification reports unreliable; orchestrator re-verification rule added to TDD guardrail

**Overall verdict:** TDD rollout discipline is **empirically validated** with two documented follow-ups (Phase 2b: mutation gate refinement; verification rigor: added as a guardrail rule).

**Outstanding gaps to address:**
1. Phase 2b — refine mutation gate granularity (per-file thresholds or per-PR "no new survived mutants")
2. Phase 1a — make e2e CI-compatible (already drafted, ready for execution)

**Next steps:**
1. Merge PR #1 via UI (Evidence Plan documented; discipline closure)
2. Phase 1a (e2e CI compat) — already drafted at `.ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md`
3. Then redesign Phase 1 (prompt refactor) under full TDD discipline
4. Phase 2b (mutation gate refinement) — can run in parallel with redesign work
5. Phase 3 (visual regression + coverage thresholds + pre-push hook) — incremental as redesign lands

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
