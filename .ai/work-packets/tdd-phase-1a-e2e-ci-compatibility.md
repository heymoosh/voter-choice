# Work Packet: tdd-phase-1a-e2e-ci-compatibility

Status: ready
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 1a follow-up (e2e CI compatibility)
Branch: launch/production

## Intent

Make `npm run e2e` (the Playwright suite) pass reliably in GitHub Actions so the `e2e` job from `.github/workflows/test.yml` can be re-added to branch-protection required-status. Phase 1 shipped the CI gate, but its first run surfaced a pre-existing gap: 46 of 94 e2e tests time out in a fresh CI runner. Branch protection was temporarily relaxed to require only the `test` job. This packet diagnoses the root cause, applies the minimum fix, restores the required-status enforcement, and proves stability over three consecutive CI runs.

## Original User Intent

From the planning session that scoped this follow-up (2026-05-20):

> "What would happen if we remove the E2E requirement? Is the E2E requirement the thing that runs playwright to do end-to-end user testing, or is it something else?"

The user asked whether removing the e2e required-status check was safe so the CI gate could land without being blocked by a pre-existing CI-readiness gap in the Playwright suite. Answer: yes, temporarily — the `test` job (lint + unit + build) still gates merges, and the e2e suite continues to be invoked locally. This packet captures the work to bring `e2e` back to required-status.

## Intent Interpretation

Phase 1's CI gate did its job: it exposed that the Playwright suite has never been exercised on a fresh Ubuntu runner. The 46 failures are not a regression — they are a discovery. The suite has been used locally by humans (who tolerate cold-start latency and warm caches) and has not been pressure-tested against the constraints of a clean CI environment.

The fix is a small, focused packet that:

1. **Investigates** the actual failure root cause via Playwright trace/screenshot artifacts and the GitHub Actions log. Don't pre-decide it's timeouts.
2. **Applies the minimum fix** needed. If timeouts are the cause, raise them just enough; if it's cold-start or environment, fix that instead.
3. **Re-runs the existing e2e suite** to confirm pass-rate on CI. Does NOT add new e2e coverage. Does NOT change what the tests assert.
4. **Re-adds `e2e` to required-status** via `gh api` once green across 3 consecutive runs.

The principle: a failing test in CI is a signal, not a nuisance. Suppressing the signal (skipping tests, raising timeouts to 60s "just to make it pass", or adding `continue-on-error: true`) defeats the gate. Root-causing matters more than green checkmarks.

This packet is sub-phase 1a — strictly between TDD Phase 1 and Phase 2. It must land before Phase 2 (Stryker) starts so the e2e gate is restored before mutation-testing scope is layered on.

## Business Logic

Rules:

- **Local baseline FIRST.** Worker MUST run `npm run e2e` locally before touching CI to baseline what passes/fails in dev. Isolates CI-only failures from genuine product bugs.
- **Diagnose from artifacts, not assumptions.** Pull Playwright traces, screenshots, and HTML reports from the CI run (or reproduce in a CI-shaped local env via `CI=1 npm run e2e`) before changing a single timeout.
- **Minimum-viable fix.** Bump by the smallest meaningful margin. Do not lift global timeout to 60s wholesale.
- **No test-content changes.** Only timing, helpers, environment setup, or config. The spec is the spec.
- **No silent skips.** If a test cannot be made to pass without a code-side fix in the app, the worker SKIPS it with `.skip()` AND opens a follow-up work packet capturing the underlying issue.
- **Deterministic across 3 runs.** Before re-adding `e2e` to required-status, worker MUST confirm 3 consecutive CI runs green. Flakiness blocks the packet.
- **Documented `gh api` command.** Exact command to re-add `e2e` to required-status is in the Verification section, not just narrative.

Assumptions:

- Failures likely share root cause (all logs point at `e2e/features.spec.ts:23:6`). If diagnosis reveals multiple causes, worker handles each.
- The 48 passing tests are triangulation: ones that DON'T traverse `goToTexasWorkspace` / `waitForResearchWorkspace` tend to pass (page-load smoke, validation, footer, legal, multi-state selector). Ones that DO tend to fail.
- CI runner: fresh ubuntu-latest, no warm next.js cache, no env vars (no Civic API key, no DATABASE_URL). The runoff gate / fallback prompt path should NOT require external service; `next start` with no env vars boots in degraded-but-functional mode.

User-confirmed decisions:

- Phase 1 ships with `test` as the only required-status check on `launch/production`. `e2e` is re-added by THIS packet.
- Bumping timeouts is acceptable IF root cause is genuinely cold-start latency. Doing it blindly is not.
- Worker may modify `.github/workflows/test.yml` if the right fix is a CI-side change. Other workflows are not in scope.

Edge cases:

- Local baseline reveals tests that fail locally too: pre-existing flakes — open follow-up packets, `.skip()` with TODO referencing the follow-up.
- Diagnosis reveals a latent product bug: fix belongs in a separate packet — skip the test, document the bug, do NOT fix product code in this packet.
- Cold-start on CI is 5+ seconds longer than locally: normal for `next start` in a fresh container. Fix is timeout bump and/or "wait for server ready" step, not disabling the test.
- `test.slow()` triples per-test budget to 30s. Failing tests in `features.spec.ts` already use `test.slow()` yet still time out at the helper's 10s `waitFor` — the helper itself is the bottleneck, not the test budget.

Out of scope:

- Adding new e2e tests; changing what existing tests assert
- Optimizing e2e total run time (parallelism, sharding); changing `workers: 1`
- Fixing product bugs surfaced by failing tests (separate follow-ups)
- Updating other workflows (`deploy.yml`, ingest workflows)
- Backporting to experiment branches (exempt from required-status by design)
- Adding new Playwright browsers (firefox, webkit)
- Mutation testing (Phase 2) or visual regression (Phase 3)

## Commercial Readiness

Applicability: launch

Lanes in scope:

- observability/support — the CI gate is the public surface for "tests pass before merge"; the e2e job restoring its required-status posture is observable in the GitHub UI and `gh pr view` output
- deployment/config — branch protection rules are touched (`gh api PUT`) to restore required-status

User decisions needed:

- none — the worker handles the `gh api` call as part of the deliverable (the user has admin and the command runs via worker shell)

Assumptions:

- The worker has `gh` CLI authenticated for the repo
- The user agrees that re-adding `e2e` to required-status is the intended outcome (confirmed in planning)

## Operational Reproducibility

Setup:

- `npm install`
- `npx playwright install --with-deps chromium` (matches what CI does)

Configuration:

- No new env vars
- The Playwright suite is expected to pass with NO env vars set (no Civic API key, no DATABASE_URL). If the diagnosis reveals a test that requires env vars, that's a finding to document — but the fix is NOT to set env vars in CI; it's to ensure the test doesn't depend on them.

Provider setup:

- GitHub Actions (already in use)
- GitHub branch protection (modified via `gh api`)

Infrastructure/deployment:

- `.github/workflows/test.yml` (the `e2e` job) is the operational surface
- Branch protection on `launch/production` is the policy surface

Database migrations:

- not applicable

Manual steps:

- One-time after this packet ships: confirm via `gh api repos/heymoosh/voter-choice/branches/launch/production/protection` (or via GitHub UI) that `e2e` appears under `required_status_checks.contexts`. Documented below.

Verification:

- `npm run e2e` locally — passes (the baseline)
- `npm run e2e` in CI — passes on 3 consecutive workflow runs against `launch/production`
- `gh run view <run-id> --log` for each of the 3 runs — no timeout failures, no skipped tests except those explicitly documented
- `gh api repos/heymoosh/voter-choice/branches/launch/production/protection` — `required_status_checks.contexts` contains both `test` and `e2e`

Test quality:

- No new test files created; existing tests' assertions unchanged
- A brief root-cause note added to the packet's Notes section as post-mortem evidence

Critical logic trigger:

- not applicable (this is CI/test-infrastructure work, not user-facing business rule change)

## Scope

Touch:

- `playwright.config.ts` — likely candidates: `timeout` (global per-test), `webServer.timeout` (server boot budget), `use.actionTimeout`, `expect.timeout`
- `e2e/features.spec.ts` — the `goToTexasWorkspace` helper (lines 7-24); the 10s `waitFor` on `prompt-output` is the suspected smoking gun
- `e2e/ballot-tool.spec.ts` — the `waitForResearchWorkspace` and `resolveTexasRunoffGate` helpers carry the same 10s `waitFor` pattern
- `.github/workflows/test.yml` — ONLY if the diagnosis requires a CI-side change (e.g., a "wait for server" step before invoking `npm run e2e`, or a `playwright test --reporter=html` upload step for diagnosing flakes)
- Branch protection on `launch/production` — re-added `e2e` via `gh api PUT`

Do not touch:

- `src/` — application source code (no product changes)
- `e2e/` tests' assertions — only their timing/helpers/setup
- Other workflows — `deploy.yml`, ingest workflows
- `main` branch
- Experiment branches and their CI posture (they're exempt from required-status by design)
- `package.json` test scripts — `npm run e2e` invocation stays as `playwright test`
- `vitest.config.ts` — unit-test config is unrelated
- `AGENTS.md`, the TDD guardrail doc, `scripts/ai-tdd-red.sh` — Phase 1 territory, already shipped
- The work-packet template (deferred; not in this packet)

## Ownership Audit

Concern: Playwright e2e suite's compatibility with the GitHub Actions runner environment
Existing owner: `playwright.config.ts` (config) + `e2e/*.spec.ts` (tests + helpers)
Neighboring owners:

- CI workflow: `.github/workflows/test.yml`
- Branch protection: GitHub repo settings
- Verification umbrella: `scripts/ai-verify.sh`

Files/modules/docs inspected:

- `playwright.config.ts`, `e2e/features.spec.ts`, `e2e/ballot-tool.spec.ts`
- `.github/workflows/test.yml`, `.github/workflows/deploy.yml`
- `package.json`, `AGENTS.md`, `docs/ai-coding-practices/guardrails/test-driven-development.md`

Reuse/edit targets:

- Extend existing helpers (`goToTexasWorkspace`, `waitForResearchWorkspace`, `resolveTexasRunoffGate`) — do NOT fork new helpers
- Use `process.env.CI` conditionals inside `playwright.config.ts` — do NOT introduce a CI-specific config file
- Extend `.github/workflows/test.yml` if needed — do NOT introduce a separate e2e workflow

New owner needed: no

Overlap/bloat risks:

- Runoff-gate handling exists in BOTH `e2e/features.spec.ts` and `e2e/ballot-tool.spec.ts`. Worker fixes both; consolidating into a shared `e2e/_helpers.ts` is nice-to-have but not required.
- `gh api` command for re-adding `e2e` overlaps with the manual GitHub UI step from Phase 1. Worker uses `gh api` (scriptable, documented); UI is the user's fallback.

Recommendation:

- Baseline locally → pull Playwright HTML report from failing CI run → identify root cause → apply minimum fix → push, verify CI → re-add `e2e` to required-status via `gh api` → run twice more for the 3-consecutive proof → document root cause in Notes post-mortem.

Execution constraints:

- Workers MUST run `npm run e2e` locally before changing any config or helper.
- Workers MUST NOT change what tests assert; MUST NOT add `continue-on-error: true`; MUST NOT bump global test timeout above 30s without explicit user check-in.
- Workers MUST document the exact `gh api` command used and MUST verify 3 consecutive green CI runs before declaring done.

## Acceptance Criteria

### Diagnosis + fix

- Local `npm run e2e` baseline is documented (which tests pass, which fail, with what error). Captured in the packet's Notes section or as commit-message evidence.
- Root cause is identified and explicitly named in the packet's Notes section as a post-mortem (e.g., "10s `waitFor` budget in `goToTexasWorkspace` exceeded by CI cold-start; bumped to 20s for CI only" — or whatever the actual cause turns out to be).
- The fix is minimal and targeted. The worker did NOT raise global timeout to 60s as a blanket workaround.

### Tests pass in CI

- All e2e tests that pass locally also pass in CI on the first push to `launch/production` after the fix.
- 3 consecutive CI workflow runs against `launch/production` show the `e2e` job green. (Trigger via 3 commits, or 1 commit + 2 manual re-runs via `gh workflow run` / "Re-run all jobs" in the UI. Document which.)
- If any test is skipped with `.skip()`, a follow-up work packet exists capturing the underlying issue (path documented in this packet's Notes).

### Branch protection re-enabled

- `gh api repos/heymoosh/voter-choice/branches/launch/production/protection` shows `required_status_checks.contexts` containing both `test` AND `e2e`.
- The exact `gh api PUT` command used is documented in this packet's Verification section (so the orchestrator can re-run it if needed).

### No regressions

- The `test` job (lint + unit + build) continues to pass.
- No new flaky tests introduced — the e2e suite is deterministic across the 3 consecutive runs.
- Local `npm run e2e` continues to work as before (no breakage in the local dev loop).

### Existing invocation unchanged

- The worker's perspective for `npm run e2e` is unchanged — same script, same command. Only config/helper changes.

## Verification

- `npm run e2e` locally — passes (baseline + post-fix)
- `npm run lint`, `npm run test`, `npm run build` — still pass (no Phase 1 regressions)
- `bash scripts/ai-verify.sh` — passes
- CI: 3 consecutive green runs of `.github/workflows/test.yml` on `launch/production` (capture run IDs)
- `gh run view <run-id>` for each of the 3 runs — no `e2e` job failures, no timeout errors
- Branch protection re-add command (worker confirms exact JSON shape against the API; the snippet below is a starting point — worker may need to pull current protection JSON and PUT the merged version to avoid clobbering other settings):
  ```bash
  # Fetch current protection config
  gh api repos/heymoosh/voter-choice/branches/launch/production/protection > /tmp/bp-current.json

  # Update required_status_checks.contexts to include both jobs
  gh api -X PUT repos/heymoosh/voter-choice/branches/launch/production/protection \
    -F required_status_checks.strict=true \
    -F 'required_status_checks.contexts[]=test' \
    -F 'required_status_checks.contexts[]=e2e' \
    -F enforce_admins=false \
    -F required_pull_request_reviews= \
    -F restrictions=
  ```
- Verify re-add: `gh api repos/heymoosh/voter-choice/branches/launch/production/protection --jq '.required_status_checks.contexts'` returns `["test","e2e"]`.

## Test Plan

> Preview of the upcoming Test Plan section that will be added to the work-packet template post-Phase-1 validation.

This packet does NOT add new test assertions. The plan is an audit of the existing e2e suite + CI proof of stability.

| AC | Test/check | Shape |
|---|---|---|
| Local baseline established | `npm run e2e` locally before changes | Pass/fail set recorded; matched against CI failure list |
| Root cause documented | Manual diagnosis via Playwright HTML report + CI log | Notes contains a 2-3 paragraph post-mortem |
| Minimum fix applied | `git diff` of changed files | Diff is small; no unrelated changes; no test-assertion changes |
| All locally-passing tests pass in CI | First post-fix CI run | `e2e` job green; `gh run view` shows 0 failures |
| 3 consecutive CI runs green | 3 sequential runs on `launch/production` | All 3 `e2e` job statuses are `success`; run IDs captured |
| Branch protection re-enabled | `gh api .../launch/production/protection` | `required_status_checks.contexts` includes both `test` and `e2e` |
| Idempotency | Same workflow re-triggered via "Re-run all jobs" | Re-run also green; no order-dependence surfaces |
| No new flakes | Pre-fix-passing test names continue to pass post-fix | Set equality, modulo any documented `.skip()` |
| `test` job still passes | Same CI runs | `test` job green alongside `e2e` |

### Investigation ritual

The worker MUST follow this sequence:

1. **Read the failing run's log:** `gh run view 26179453048 --repo heymoosh/voter-choice --log-failed`. Confirm test names that failed.
2. **Run the suite locally:** `npm run e2e` from `launch/production`. Compare pass/fail against CI's set.
3. **Triangulate via the passing 48.** Tests that don't traverse `goToTexasWorkspace` pass. What does the helper do that they don't?
4. **Pull the Playwright HTML report from CI** if the log alone isn't sufficient. If not currently uploaded, add the upload step as part of this packet's CI changes.
5. **Hypothesize the root cause** (see Notes for candidates).
6. **Reproduce the CI environment locally:** `CI=1 npm run e2e` (since `reuseExistingServer: !process.env.CI`, CI=1 forces a fresh server boot).
7. **Test the hypothesis.** Smallest change consistent with the hypothesis. Push. Watch CI.
8. **Don't stop at "it passed."** Run twice more (3 total). If any flake, diagnosis is incomplete — go back to step 4.
9. **Document root cause** as 2-3 paragraphs in Notes post-mortem.
10. **Re-add `e2e` to required-status** via `gh api PUT`. Verify via `gh api ... --jq '.required_status_checks.contexts'`.

## Evidence Plan

Visual evidence:

- Playwright HTML report from FAILING run (run 26179453048) and post-fix PASSING run (if CI uploads it)
- `gh api` JSON output showing branch protection's `required_status_checks.contexts` after re-add

Behavior evidence:

- Local `npm run e2e` output BEFORE changes: pass/fail counts, canonical error message
- Local `npm run e2e` output AFTER changes: full suite green
- CI `npm run e2e` output for 3 consecutive runs on `launch/production`: all green
- `gh run list --workflow=test.yml --branch=launch/production` showing the 3 green runs

Business logic evidence: not applicable (CI infrastructure)

Persistence evidence: not applicable

Auth/security evidence:

- Branch protection's `required_status_checks.contexts` field observable via `gh api`; confirms policy is enforced server-side

Commercial readiness evidence:

- observability/support: e2e job status appears in PR checks and `gh pr view` output
- deployment/config: branch protection rules updated via `gh api`, captured in command history

Operational evidence:

- `gh run view <run-id>` output for each of the 3 green runs
- `git log` showing the small, focused diff
- `gh api .../launch/production/protection` output post-update

Integration evidence:

- E2e suite runs against a real `next start` server (not a mock). Runoff gate, prompt rendering, ballot upload, ballot printout, and profile download all execute against real product code.

Regression evidence:

- Pre-Phase-1a-passing tests continue to pass; `npm run lint`, `npm run test`, `npm run build` all green
- No new `.skip()` without an accompanying follow-up packet

Proof standard:

- Reviewer can: (a) read post-mortem in Notes; (b) inspect `git diff` (small, targeted); (c) see 3 consecutive green CI runs; (d) confirm via `gh api` that `e2e` is in `required_status_checks.contexts`; (e) re-run the workflow once more and observe it passes.

Non-proof:

- Bumping timeouts to 60s without documented root cause
- Single green run (need 3 consecutive)
- "Branch protection updated" without `gh api` JSON evidence
- Skipped tests without follow-up packets

## Anti-Solutions

- Do NOT skip failing tests with `.skip()` without an explicit reason AND a follow-up packet capturing the underlying issue.
- Do NOT bump the global per-test timeout to 60s "just to make it pass" — root-cause it first. 20-30s defensible; 60s hides regressions.
- Do NOT add `continue-on-error: true` to the e2e job. The point of required-status is gating; non-blocking defeats the gate.
- Do NOT change what existing tests assert. Only timing, helpers, environment setup.
- Do NOT modify product code in `src/` to make tests pass. Bug → follow-up packet.
- Do NOT introduce a CI-only config file. Use `process.env.CI` conditionals inside the existing `playwright.config.ts`.
- Do NOT enable Playwright tracing/video for ALL tests in CI permanently — overhead is real. Use `trace: 'on-first-retry'` or scope diagnosis temporarily.
- Do NOT change `workers: 1` for "speedup" — parallelism can introduce flakes; out of scope.
- Do NOT update `AGENTS.md`, the TDD guardrail, or `scripts/ai-tdd-red.sh` — Phase 1 territory.
- Do NOT re-add `e2e` to required-status BEFORE confirming 3 green runs. Premature re-enable causes merge blocks on residual flakes.
- Do NOT install new Playwright browsers (firefox, webkit) — agreed scope is chromium (desktop + mobile).

## Notes

### Canonical failure trace

The first failing CI run is **GitHub Actions run ID `26179453048`** on `launch/production`. Pull the full failure log via:

```bash
gh run view 26179453048 --repo heymoosh/voter-choice --log-failed
```

That run failed 46 of 94 Playwright tests, all sharing the same error:

```
TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('prompt-output') to be visible
```

At `e2e/features.spec.ts:23:6` in the `goToTexasWorkspace` helper. 48 tests **passed** in the same run; the 48 passing tests are the triangulation set (they don't traverse `goToTexasWorkspace` or `waitForResearchWorkspace`).

Failures span both `chromium-desktop` and `chromium-mobile`, consistent with a server-side / cold-start / helper-timing cause rather than a viewport-specific cause. Affected describe blocks include `Sample ballot upload`, `Ballot printout popup`, `Voter profile download`, `Valid zip code — Texas (73301)`, all `State coverage` blocks, `Copy to clipboard`, and the Enter-key submission test under `Keyboard accessibility`.

### Likely contributing causes (worker investigates; do not pre-decide)

1. **Per-test timeout of 10s.** The `goToTexasWorkspace` helper alone budgets up to 12.5s (2.5s runoff gate + 10s `prompt-output`). Helper exceeds per-test budget. Strongest hypothesis.
2. **`next start` cold-start delay on Ubuntu CI runner.** Fresh runner adds 3-5s before first request served; per-test timeout starts on `page.goto("/")`, eating budget.
3. **No env vars in CI.** Civic API key absent. Runoff gate / fallback prompt path should work without env, but worth confirming no test depends on a stalling Civic call.
4. **`reuseExistingServer: !process.env.CI`.** Every CI run boots a fresh `next start`. Cost is real.
5. **`expect.timeout: 3000`** may be tight for hydration-bound `toBeVisible` assertions in the helper.

The runoff-gate timing is included as a hypothesis (item 1) — even though `test.slow()` triples per-test budget for `features.spec.ts` blocks to 30s, the failing `waitFor` is the 10s one on `prompt-output`, not the runoff-gate's 2.5s `.catch()`. The 10s `prompt-output` wait is the smoking gun. Worker confirms via diagnosis.

### Post-mortem template (fill in after fix lands)

> **Root cause:** [1-2 sentences naming the exact cause]
>
> **Fix applied:** [1-2 sentences describing the minimum change]
>
> **Why this isn't a hack:** [1-2 sentences explaining why the fix is principled — e.g., "10s was an arbitrary local-dev number; the real budget for cold-start CI is X seconds plus the helper's traversal time"]
>
> **What changed in CI behavior:** [1 sentence — e.g., "Branch protection's `required_status_checks` now includes both `test` and `e2e`"]

### Follow-up triggers

- If diagnosis reveals a product bug (test fails because of a genuine app issue, not a CI gap): open a follow-up packet; skip the test with `.skip()` and a TODO referencing the follow-up.
- If multiple distinct root causes exist: each gets a paragraph in the post-mortem; fix in this packet IF small; otherwise spin a separate follow-up.
- If the 3-consecutive-green proof reveals flakiness (1 of 3 fails intermittently): diagnosis is incomplete. Do NOT proceed to branch-protection re-add. Loop back.

### Reference: the lines most likely to change

In `playwright.config.ts`: the global `timeout: 10000`, the `expect.timeout: 3000`, the `use.actionTimeout: 3000`, and the `webServer.timeout: 30000`. All four are candidates for CI-conditional bumps via `process.env.CI` ternaries.

In `e2e/features.spec.ts` (the `goToTexasWorkspace` helper line 23) and `e2e/ballot-tool.spec.ts` (the `waitForResearchWorkspace` and `resolveTexasRunoffGate` helpers): each carries a 10s `waitFor` on `prompt-output` or `chat-window` that is the proximate timeout source. CI-conditional bumps to 20s would likely unblock the suite — but the worker confirms via diagnosis before changing.

The discipline: do NOT change these without diagnosing WHY. If the actual cause is a missing env var, a network call that 500s, or a hydration race, the fix is different.
