# Work Packet: tdd-phase-1-core-discipline

Status: ready
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 1 (Core TDD discipline)
Branch: launch/production

## Intent

Bring Simon Willison's red/green TDD discipline online as the default execution pattern for all work on `launch/production`. Ship the CI test workflow, branch protection, a mandatory red-phase enforcement script, a TDD guardrail doc, and an AGENTS.md root-contract update. Validate the workflow end-to-end on one small real task — the "limited data notice" P1 from `docs/operations/post-launch-backlog.md` — before standardizing the work-packet template.

## Original User Intent

From the planning session (2026-05-19):

> "We need to apply some test-driven development. We need to write tests before we code to ensure that what we built actually runs accordingly. … I want to absolutely enforce Willison's practice on TDD. … On the red face evidence, we need it formal. I want the version that is more rigorous. … Let's just require the CI on launch production for now."

> "Let's validate the workflow first before we update the work packet template."

> "Can you pick a small task yourself?"

## Intent Interpretation

The user wants TDD to *be* the discipline — not "we should write tests when we get around to it" but "tests are written first, period, and the red phase is verified by a script that exits non-zero if you skip it." This packet ships the enforcement primitives plus one real end-to-end validation pass so we know the ritual produces clean work rather than busy work.

Three structural moves:

1. **Make the red phase mandatory and machine-checkable.** A `scripts/ai-tdd-red.sh` script takes a test file, runs it, and exits 1 if no test fails. That's the gate. A worker who skips the red phase gets blocked, not chided.
2. **Make CI gate every merge to `launch/production`.** A `.github/workflows/test.yml` runs lint + test + build (one job) and e2e (another) on every PR and push. GitHub branch protection makes both jobs required-status before merge. Regressions can no longer ship silently.
3. **Validate before standardizing.** The work-packet template doesn't get the new Test Plan section yet. Instead, we execute the full ritual on one small task — the "limited data notice" P1 — and update the template afterward, informed by what Phase 1 actually felt like in practice.

This packet is the foundation. TDD Phase 2 (Stryker) builds on it; TDD Phase 3 (visual + thresholds + pre-push) builds on both. Redesign work resumes only after Phase 1 + Phase 2 land.

## Business Logic

Rules:

- **Tests are written first.** Implementation never precedes its tests.
- **The red phase is verified.** `scripts/ai-tdd-red.sh <test-file>` is the gate. It runs the named test file, asserts at least one test fails, prints the failure, exits 0. If all tests pass, it exits 1 with: `your test isn't testing the thing you think it is`.
- **The captured failure output is part of the evidence.** Workers paste the script's output into the work-packet's Evidence Plan or surface it in chat. "I ran the red phase" without the artifact doesn't count.
- **CI gates merges.** Branch protection on `launch/production` requires the `test` and `e2e` jobs from `test.yml` to be green before merge.
- **Experiment branches are exempt.** No required-status checks on `experiment/*`, `claude/*`, `run-log/*`, or other non-production branches. The branch protection rule is scoped to `launch/production`.
- **AGENTS.md root contract states the ritual.** Adding a short subsection under Verification, not just a linked guardrail doc. Every fresh session reading AGENTS.md sees the rule.
- **The validation task is real work, not a toy.** The "limited data notice" fix from `docs/operations/post-launch-backlog.md` produces user-facing behavior change and ships as part of this packet's evidence.
- **The work-packet template is NOT updated in this packet.** Template change is a follow-up after Phase 1 lands and the ritual is known to work in practice.

Assumptions:

- The user (Muxin) configures branch protection in the GitHub UI manually after the test workflow is shipped and merged. The packet's deliverables include explicit instructions; the actual click is hers.
- The `scripts/ai-verify.sh` umbrella gate continues to exist alongside the new red-phase enforcement. ai-verify covers the green-and-passing case (lint + test + build); ai-tdd-red covers the inverted check (one test fails before implementation).
- Existing tests (`~30` files) pass when CI first runs. If any are flaky or env-dependent, address before turning branch protection on; flagging this as a known risk.

User-confirmed decisions:

- Branch protection only on `launch/production`. Experiment branches exempt.
- Red-phase enforcement is formal via the script (rigorous), not ritual via the worker pasting failures.
- AGENTS.md gets the bake-in update.
- Validation task: the "limited data notice" fix from `docs/operations/post-launch-backlog.md`. Specifically: when `lookup_alignment` returns `total < 5` contributing votes, the response surfaces a "limited data" notice instead of silently looking like the candidate barely addresses the issue.
- The work-packet template update is **deferred** to a follow-up.

Edge cases:

- A worker writes a test that *throws* during setup (not a meaningful assertion failure). `ai-tdd-red.sh` should still consider that "red" — any failure exit from vitest counts.
- A worker writes a test file that contains both failing and passing tests, then runs the script. As long as at least one fails, the script exits 0. (Passing tests inside a partially-red file are acceptable — they may be testing already-existing scaffolding.)
- A worker writes a test that passes (no implementation needed because the codebase already does the thing). The script exits 1. The worker should treat that as a signal: either the AC is already satisfied (delete the test or repurpose it as a regression-lock), or the test is too weak.
- CI runs against a PR from a forked repo (rare for this project but possible). Secrets aren't injected into PRs from forks; treat as expected; document.
- A test takes >5 minutes and times out the CI runner. Out of scope for Phase 1; address via test parallelization later.
- The deploy workflow fires while the test workflow is mid-run for the same commit. Branch protection blocks merge until tests pass, so this only happens after tests are green — but the deploy workflow shouldn't *also* be gated on tests directly (separate concerns). Document the sequencing.

Out of scope:

- Mutation testing (Phase 2).
- Visual regression (Phase 3).
- Coverage thresholds (Phase 3).
- Pre-push hook (Phase 3 — pre-commit is enough for v1).
- Updating the work-packet template (post-validation follow-up).
- Backfilling Test Plan sections into the 9 redesign packets (post-validation follow-up).
- Enabling AQE (Phase 4 — deferred).
- Any redesign work — `redesign-phase-1-prompt-refactor.md` starts only after Phase 1 + Phase 2 are both done.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX — the "limited data notice" validation task is user-facing
- observability/support — CI surfaces failures publicly
- deployment/config — branch protection turns "should test before deploy" into "can't merge without testing"
- API/contracts — the alignment-response shape gets a tested addition

User decisions needed:

- Manual one-time branch protection setup after the test workflow is merged

Assumptions:

- GitHub repo settings access (the user has admin)

## Operational Reproducibility

Setup:

- `npm install`
- `chmod +x scripts/ai-tdd-red.sh`

Configuration:

- No new env vars

Provider setup:

- GitHub Actions (already in use for deploy + ingest workflows)

Infrastructure/deployment:

- New CI workflow runs on PR + push to `launch/production`
- Existing deploy.yml continues to fire on push to `launch/production`

Database migrations:

- not applicable

Manual steps:

- One-time: after merging the test workflow, in GitHub Settings → Branches → Add rule for `launch/production`:
  - Require status checks before merging
  - Required checks: `test`, `e2e`
  - Require branches up to date before merging (optional but recommended)
- Documented in the new guardrail doc and in AGENTS.md.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `bash scripts/ai-verify.sh`
- `bash scripts/ai-tdd-red.sh <test-file>` — run on the validation task's tests before implementation
- Manual GitHub PR opened against `launch/production`; verify the test workflow runs and gates merge

Test quality:

- The red-phase script itself has tests: given a test file with all-passing tests, expect exit 1 + the "isn't testing" message; given a test file with a failing test, expect exit 0 + the failure output.
- The validation task's tests assert the limited-data-notice behavior via unit tests at minimum.

Critical logic trigger:

- business rule (the alignment-response notice is user-visible behavior; the TDD discipline is a process-level commitment)

## Scope

Touch:

- new `.github/workflows/test.yml` — CI test gate
- new `scripts/ai-tdd-red.sh` — red-phase enforcement script (chmod +x)
- new `scripts/ai-tdd-red.test.sh` (or vitest equivalent) — tests for the red-phase script itself
- new `docs/ai-coding-practices/guardrails/test-driven-development.md` — the TDD guardrail
- `AGENTS.md` — add a short TDD subsection under Verification
- `docs/ai-coding-practices/commands/start-work.md` — add a red-phase ritual step
- `docs/ai-coding-practices/commands/work-next.md` — add a red-phase enforcement reference
- (Validation task) `src/lib/server/alignment.ts` — add the limited-data-notice logic
- (Validation task) `src/lib/server/alignment.test.ts` — add the new tests (written FIRST per the ritual)
- (Validation task) potentially `src/lib/server/alignment-formatter.ts` if a clean extraction is needed
- (Validation task) any chat-route consumer that surfaces the notice text

Do not touch:

- `main` branch
- Existing `.github/workflows/deploy.yml` or ingest workflows
- `docs/ai-coding-practices/templates/work-packet.md` (deferred to post-validation)
- The 9 redesign packets (no Test Plan backfill in this packet)
- AQE-adjacent files (`.claude/mcp.json`, `.codex/config.toml`, `scripts/ai-qe-check.sh`)
- The cold-open UI (Phase 2 redesign territory)
- The workspace shell (Phase 3 redesign territory)

## Ownership Audit

Concern: TDD discipline, red-phase enforcement, CI test gate, branch protection
Existing owner: none for TDD specifically (existing `qe-tooling.md` covers AQE only); `scripts/ai-verify.sh` covers verification but not TDD
Neighboring owners:

- verification umbrella: `scripts/ai-verify.sh`
- pre-commit hook: `.githooks/pre-commit`
- work-packet rules: `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- AGENTS.md root contract

Files/modules/docs inspected:

- `package.json` (test scripts, devDependencies)
- `vitest.config.ts`, `playwright.config.ts`
- `.github/workflows/deploy.yml`, ingest workflows
- `.githooks/pre-commit`
- `scripts/ai-verify.sh`, `scripts/ai-qe-check.sh`
- `docs/ai-coding-practices/guardrails/qe-tooling.md`
- `docs/ai-coding-practices/guardrails/work-packet-rules.md`
- `docs/ai-coding-practices/templates/work-packet.md`
- `docs/ai-coding-practices/commands/start-work.md`, `work-next.md`
- `docs/operations/post-launch-backlog.md` (validation task source)
- `src/lib/server/alignment.ts` (validation task target — to inspect during /start-work)
- `AGENTS.md`

Reuse/edit targets:

- Extend AGENTS.md (don't fork)
- New guardrail file alongside existing guardrails (parallel structure)
- New script alongside `scripts/ai-verify.sh` (parallel structure)
- Reuse existing test conventions (Vitest, RTL); no new test frameworks

New owner needed:

- yes — `docs/ai-coding-practices/guardrails/test-driven-development.md` (TDD discipline)
- yes — `scripts/ai-tdd-red.sh` (red-phase enforcement)
- yes — `.github/workflows/test.yml` (CI gate)

Overlap/bloat risks:

- `scripts/ai-verify.sh` and `scripts/ai-tdd-red.sh` could be confused. Mitigation: ai-verify checks "is everything green?"; ai-tdd-red checks "is at least one new test red?" — opposite checks, clearly named.
- AGENTS.md bake-in plus guardrail doc creates two sources of truth. Mitigation: AGENTS.md states the ritual in 2-3 sentences; the guardrail doc owns the detail; AGENTS.md links to it.
- Pre-commit hook running ai-verify could mask the red phase (since pre-commit blocks failing tests from being committed). Mitigation: the red phase happens *before* the test file is staged for commit; the test goes red locally, then the implementation goes in, then both are committed together (already green by then). No conflict with pre-commit.

Recommendation:

- Ship the CI workflow + branch protection + red-phase script + guardrail doc + AGENTS.md update + validation task in one packet. Single coherent diff.

Execution constraints:

- Workers must NOT update the work-packet template in this packet (deferred follow-up).
- Workers must NOT backfill Test Plan sections into the 9 redesign packets in this packet (deferred follow-up).
- Workers must NOT change the deploy workflow.
- Workers must NOT enable AQE.
- Workers must run `scripts/ai-tdd-red.sh src/lib/server/alignment.test.ts` BEFORE implementing the limited-data-notice change. Capture the output. Reference it in the Evidence Plan.

## Acceptance Criteria

### TDD infrastructure

- `.github/workflows/test.yml` exists with two jobs (`test` and `e2e`) running on `pull_request` and `push` to `launch/production`.
- `scripts/ai-tdd-red.sh` exists, is executable, and:
  - Takes one argument (a test file path).
  - Runs `npm run test -- <file>` (or vitest equivalent).
  - If at least one test fails, exits 0 and prints "[ai-tdd-red] confirmed RED — proceed to implementation" plus the failure output.
  - If all tests pass, exits 1 and prints "[ai-tdd-red] ERROR: test passed without implementation. Your test isn't testing the thing you think it is."
  - Has its own tests (verified by `npm run test`) covering both branches.
- `docs/ai-coding-practices/guardrails/test-driven-development.md` exists. Documents the Willison ritual, the red-phase script, the CI gate, and the branch-protection requirement.
- `AGENTS.md` has a new "Test-Driven Development" subsection under Verification (or as a peer section) stating the ritual in 2–3 sentences and linking to the guardrail.
- `docs/ai-coding-practices/commands/start-work.md` lists "write tests first, run `scripts/ai-tdd-red.sh`, capture failure output, then implement" as a step.
- `docs/ai-coding-practices/commands/work-next.md` references the red-phase requirement.

### Validation task — "limited data notice"

- `src/lib/server/alignment.test.ts` (or equivalent) contains new tests that assert: when the alignment lookup returns `total < 5`, the response includes a "limited data" notice. Tests written BEFORE implementation; failure captured via `ai-tdd-red.sh`.
- The implementation adds the notice; the new tests turn green; `npm run test` passes overall.
- The notice text is user-friendly and informative (e.g., "Limited data: only N relevant votes found for this issue" — exact wording is the worker's call, asserted via test).
- The change does NOT alter the canonical `kept`/`total` fields; it adds a structured `notice` (or similar) field that the chat layer can surface.

### CI + branch protection

- A test PR (could be the merge of this packet itself) shows the `test` and `e2e` jobs running in GitHub Actions.
- After branch protection is configured by the user, a follow-up PR is documented as having required-status check enforcement (screenshot or `gh pr view` output).

### General

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` all pass.
- `bash scripts/ai-verify.sh` passes.

## Verification

- `npm run lint` clean.
- `npm run test` passing — includes the new alignment.test.ts cases and the ai-tdd-red.sh self-tests.
- `npm run build` successful.
- `npm run e2e` passing.
- `bash scripts/ai-verify.sh` passes.
- `bash scripts/ai-tdd-red.sh src/lib/server/alignment.test.ts` was run BEFORE implementation and produced expected red output. Captured in Evidence.
- After merge: GitHub Actions shows the test workflow ran on this PR. After branch protection is configured: subsequent PRs show the required-status enforcement.

## Test Plan

> Preview of the upcoming Test Plan section that will be added to the work-packet template after Phase 1 validation. Format: per-AC list of test file + assertion shape.

| AC | Test file | Test shape |
|---|---|---|
| `ai-tdd-red.sh` exits 1 on all-passing test file | `scripts/ai-tdd-red.test.sh` (bash) or vitest spec | given fixture with all-passing tests, expect exit code 1 + "isn't testing" message |
| `ai-tdd-red.sh` exits 0 on file with failing test | same | given fixture with at least one failing test, expect exit code 0 + failure output present |
| `ai-tdd-red.sh` requires an argument | same | given no args, expect exit 1 + usage message |
| Limited-data notice surfaces when `total < 5` | `src/lib/server/alignment.test.ts` | input: `{ found: true, kept: 1, total: 3 }`; expected: result includes a `notice` field containing "limited data" |
| Limited-data notice does NOT surface when `total >= 5` | same | input: `{ found: true, kept: 4, total: 10 }`; expected: `notice` field absent or empty |
| Existing alignment-response cases unchanged | `src/lib/server/alignment.test.ts` (existing cases) | all current tests continue to pass — regression lock |
| CI workflow runs on PR | `.github/workflows/test.yml` (smoke verified post-merge) | open a PR; observe `test` and `e2e` jobs in Actions tab |

### Red-phase ritual for this packet

The worker MUST follow this sequence for the validation task:

1. Read `src/lib/server/alignment.ts` to understand the current shape.
2. Write `src/lib/server/alignment.test.ts` cases for the limited-data notice (per Test Plan above).
3. Run `bash scripts/ai-tdd-red.sh src/lib/server/alignment.test.ts`.
4. Confirm it exits 0 with failure output. Capture the output (paste into Evidence Plan).
5. Implement the limited-data notice in `src/lib/server/alignment.ts` (or a sibling formatter module).
6. Run `npm run test -- src/lib/server/alignment.test.ts` — confirm green.
7. Run `npm run test` — confirm no regressions.
8. Run `bash scripts/ai-verify.sh` — confirm green.
9. Commit (one commit: tests + implementation together, since the red phase is the local pre-commit verification).
10. Push, open PR, observe CI.

If step 3 exits 1 ("test passed without implementation"), the test is too weak — fix the test, repeat from step 3.

## Evidence Plan

Visual evidence:

- Screenshot of GitHub Actions tab showing the `test` and `e2e` jobs running on this PR.
- Screenshot of GitHub branch protection settings page after the user configures `launch/production` rules.
- (For validation task) screenshot or DOM snippet of the limited-data notice surfacing in chat for a low-`total` scenario.

Behavior evidence:

- Captured output of `bash scripts/ai-tdd-red.sh src/lib/server/alignment.test.ts` run BEFORE implementation, showing the red phase.
- Captured output of `npm run test -- src/lib/server/alignment.test.ts` AFTER implementation, showing green.
- Captured output of full `npm run test`, `npm run lint`, `npm run build`, `npm run e2e` all green.

Business logic evidence:

- Rule: "Limited data notice when total < 5" — fixture input `{found: true, kept: 1, total: 3}`, expected `result.notice` matches `/limited data/i`, observed match.
- Rule: "No notice when total >= 5" — fixture input `{found: true, kept: 4, total: 10}`, expected no notice or empty notice, observed match.
- Rule: "Red phase enforced" — self-test of `ai-tdd-red.sh` against a fixture with all-passing tests, expected exit 1, observed exit 1.

Persistence evidence:

- not applicable (no DB or localStorage changes)

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- product UX lane: limited-data notice is a measurable UX improvement on the alignment surface.
- deployment/config lane: branch protection rules are configured and verified via a test PR.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`, `bash scripts/ai-verify.sh` — all command outputs captured.
- `bash scripts/ai-tdd-red.sh` red-phase output captured.

Integration evidence:

- A real PR opened against `launch/production` triggers the new test workflow; jobs run; merge gated by branch protection after configuration.

Regression evidence:

- All existing tests (the ~30 files in `src/`) pass after the new code lands.
- No e2e regressions.

Proof standard:

- A reviewer can: (a) read AGENTS.md and see the TDD ritual; (b) read the new guardrail doc; (c) inspect `scripts/ai-tdd-red.sh` and its tests; (d) inspect `.github/workflows/test.yml`; (e) inspect the new alignment-test cases (commit timestamp earlier than impl OR commit message indicating test-first); (f) see the captured red-phase output in the Evidence section; (g) observe the PR's required-status check on GitHub.

Non-proof:

- "I wrote tests and they passed" without the red-phase output.
- "CI workflow exists" without an actual PR run showing it triggered.
- "Branch protection is configured" without a screenshot or `gh api` confirmation.

## Anti-Solutions

- Do NOT skip the red phase. The whole packet exists to make skipping impossible; circumventing it defeats the point.
- Do NOT write a test that "passes against future code" — the test must fail when the implementation doesn't exist. If a test passes without implementation, the test is hollow.
- Do NOT bypass `ai-tdd-red.sh` with `--no-verify` on commits — pre-commit hook is not the red-phase gate; the script is.
- Do NOT update the work-packet template in this packet. Deferred until Phase 1 validation is complete.
- Do NOT backfill Test Plan sections into the 9 redesign packets in this packet. Same deferral.
- Do NOT add Stryker, visual regression, coverage thresholds, or AQE in this packet. Phase 2/3/4 territory.
- Do NOT relax the limited-data threshold to make tests easier (e.g., `total < 3` instead of `< 5`). The threshold is a business rule from the backlog; tests adapt to it, not vice versa.
- Do NOT change the `kept`/`total` field shapes; ADD a `notice` field. Backward-compat with existing consumers.
- Do NOT make the CI workflow optional (e.g., `continue-on-error: true`) — branch protection requires it to actually gate.
- Do NOT include the deploy workflow in the test workflow's `needs:` — they're separate concerns; the deploy fires post-merge and branch protection already gates the merge.

## Notes

- Sequence of work for the worker:
  1. Read this packet end-to-end.
  2. Read `src/lib/server/alignment.ts` to understand the current shape.
  3. Read `docs/operations/post-launch-backlog.md` (the relevant P1 section) for context on the user impact.
  4. Read the existing `src/lib/server/budget.test.ts` and `src/lib/server/rate-limit.test.ts` for convention reference.
  5. Build `scripts/ai-tdd-red.sh` and its self-tests FIRST — this is meta-TDD (use TDD to build the TDD enforcer).
  6. Build the CI workflow and the guardrail doc.
  7. Update AGENTS.md and the command docs.
  8. Execute the red-phase ritual on the validation task (limited-data notice).
  9. Commit, push, open PR, observe CI.
  10. Prompt the user to configure branch protection (manual GitHub step).
  11. Surface the lessons for the work-packet template update (deferred follow-up).
- The `scripts/ai-tdd-red.sh` script should be minimal — bash, no dependencies beyond what's already available (npm, grep). See the project-brief's Phase 1 sketch for a starting shape:
  ```bash
  #!/usr/bin/env bash
  set +e
  if [ -z "$1" ]; then
    echo "usage: scripts/ai-tdd-red.sh <test-file>"
    exit 1
  fi
  output=$(npm run test -- "$1" 2>&1)
  echo "$output"
  if echo "$output" | grep -q "FAIL\|✗\|Error"; then
    echo "[ai-tdd-red] confirmed RED — proceed to implementation"
    exit 0
  else
    echo "[ai-tdd-red] ERROR: test passed without implementation. Your test isn't testing the thing you think it is."
    exit 1
  fi
  ```
  The actual implementation may need to be more robust (handle vitest's specific failure-output patterns; differentiate "no tests found" from "all tests passed"). Worker decides.
- For the CI workflow, model on `.github/workflows/deploy.yml` for the setup-node + cache-npm patterns. The test workflow does NOT need Bitwarden secrets — it's just `npm ci && npm run lint && npm run test && npm run build` (job 1) and `npx playwright install --with-deps chromium && npm run e2e` (job 2).
- Branch protection setup is documented as a manual step. After the workflow is merged, the user opens GitHub Settings → Branches → Add rule for `launch/production` → check "Require status checks to pass before merging" → add `test` and `e2e` as required checks.
- The validation task ("limited data notice") is a real user-facing fix. Worker should not over-engineer it — the goal is a clean small change that exercises the new TDD discipline end-to-end.
- After this packet ships, the next packet (`tdd-phase-2-mutation-testing.md`) is ready to groom. The work-packet template update is a separate small task that happens between Phase 1 and Phase 2.
