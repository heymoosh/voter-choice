# Test-Driven Development

Test-driven development is the default execution pattern for work on `launch/production`. Tests are written first, the red phase is verified, then implementation lands. This guardrail captures the ritual, the enforcement primitives, and the boundaries.

## The Willison Red/Green Ritual

The canonical six-step procedure for any change that implements against an acceptance criterion:

1. Write the test that asserts the AC's observable behavior.
2. Run the test. Watch it fail. Failure is the proof the test is targeting unwritten behavior.
3. Capture the failure output. Paste it into the work packet's Evidence Plan or surface it in chat.
4. Write the minimum implementation needed to satisfy the test.
5. Run the test again. Watch it pass.
6. Run the full suite (`npm run test`) and commit tests + implementation together.

If step 2 passes without implementation, the test is hollow. Strengthen the test before proceeding.

## Red-Phase Enforcement

`scripts/ai-tdd-red.sh <test-file>` is the mandatory red-phase gate. The script takes a test file path, runs it, and asserts at least one test fails before implementation exists.

Behavior:

- One required argument: path to the test file. Missing argument exits 1 with a usage message.
- Runs the test file via the project's vitest runner.
- If at least one test fails, prints the failure output, prints `[ai-tdd-red] confirmed RED — proceed to implementation`, and exits 0.
- If all tests pass, prints `[ai-tdd-red] ERROR: test passed without implementation. Your test isn't testing the thing you think it is.` and exits 1.

A worker who skips the red phase gets blocked, not chided. The captured output is evidence; "I ran the red phase" without the artifact does not count.

## CI Gate

`.github/workflows/test.yml` runs on every pull request and on every push to `launch/production`. Two jobs:

- `test` — `npm ci`, `npm run lint`, `npm run test`, `npm run build`.
- `e2e` — `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e`.

Both job names (`test` and `e2e`) are referenced by branch protection. Renaming jobs requires updating the branch-protection rule in sync.

## Branch Protection

`launch/production` is the only protected branch. Experiment branches (`experiment/*`, `claude/*`, `run-log/*`) are intentionally exempt — they exist to measure other-workflow discipline; gating them defeats the measurement.

One-time setup, performed manually by the repo admin via the GitHub UI:

1. Open Settings → Branches → Add rule for `launch/production`.
2. Check "Require status checks to pass before merging."
3. Add `test` and `e2e` as required checks.
4. Optional but recommended: "Require branches to be up to date before merging."

After configuration, every PR into `launch/production` is gated by green CI; the deploy workflow only fires post-merge, so a failing build cannot reach deploy.

## Boundaries

TDD as defined here does NOT cover:

- **Mutation testing** — measuring whether tests would catch real bugs. Deferred to TDD Phase 2 (`tdd-phase-2-mutation-testing.md`).
- **Visual regression** — baseline-diffing rendered UI. Deferred to TDD Phase 3 (`tdd-phase-3-visual-regression-and-thresholds.md`); waits for the redesign to land.
- **Agentic QE (AQE)** — advisory evaluator tooling. Deferred to TDD Phase 4 (trigger-based, no packet drafted). See `qe-tooling.md` for the AQE posture.
- **Coverage thresholds and pre-push hooks** — Phase 3 territory.

The Willison ritual + red-phase script + CI gate + branch protection together form the foundation. Later phases build on it.
