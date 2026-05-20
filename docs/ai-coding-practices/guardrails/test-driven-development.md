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

## Mutation Testing

Regular tests check that code does what it should. Mutation testing checks that the **tests** would notice if the code stopped doing what it should. A mutation tool (Stryker, in this repo) makes tiny harmful changes to your production code — flips a `>` to `>=`, replaces `&&` with `||`, drops a `!`, returns `null` instead of a value — and re-runs the test suite against each mutant. If a test catches the change, the mutant is "killed" (good — your suite would catch that bug in real code). If everything passes, the mutant "survived" (bad — your suite has a blind spot). The percentage killed is the mutation score; a high score means your tests actually assert on observable outcomes, not just hit lines.

Mutation testing is slow — Stryker re-runs the relevant tests for every mutant, so we scope it tightly. V1 scope (the files Stryker mutates today): `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`, `src/lib/server/alignment.ts`, `src/lib/generatePrompt.ts`, `src/lib/getStateData.ts`. Glob patterns in `stryker.config.json` also reserve the not-yet-created paths `src/lib/prompts/**`, `src/lib/state-rules/**`, and `src/lib/anthropic-client-byok.ts`; those activate automatically as redesign Phases 1, 5, and 9 land their respective files.

Local invocation: `bash scripts/ai-mutation-check.sh`. The wrapper runs `npx stryker run` against `stryker.config.json` (which extends `tsconfig.stryker.json` so pre-existing TS errors in unrelated UI files do not block Stryker's dry-run compile), forwards Stryker's exit code (0 if score ≥ break threshold, non-zero otherwise), and prints a one-line summary of mutants killed / survived / score / threshold. Reports land under `reports/mutation/` (HTML + JSON) — both gitignored.

Initial break threshold: **22%**. This is ~5 points below the observed baseline of **26.90%** measured on 2026-05-20, giving CI headroom for run-to-run noise. The headline number is dragged down by a single file (`generatePrompt.ts`) where Stryker reports zero coverage for all 277 non-compile-error mutants — current tests assert on the final rendered prompt string and don't reach the internal helper bodies that house most of the logic. That file is slated for replacement in redesign Phase 1 (prompt routing fleet); the new code will be mutation-tested from day one under the same scope. The "covered" mutation score (which excludes no-coverage mutants and is the more honest signal of where tests do reach) is **44.79%** overall — useful context for the ratchet plan.

Baseline by file (2026-05-20):

| File | total score | covered score | killed | survived | no-cov | compile-err |
| --- | --- | --- | --- | --- | --- | --- |
| `src/lib/server/alignment.ts` | 73.63% | 74.44% | 67 | 23 | 1 | 51 |
| `src/lib/server/budget.ts` | 48.26% | 54.97% | 83 | 68 | 21 | 58 |
| `src/lib/server/rate-limit.ts` | 36.94% | 42.03% | 58 | 80 | 19 | 39 |
| `src/lib/generatePrompt.ts` | 0.00% | 0.00% | 0 | 0 | 277 | 72 |
| `src/lib/getStateData.ts` | 9.40% | 10.00% | 11 | 99 | 7 | 78 |
| **all files** | **26.90%** | **44.79%** | **219** | **270** | **325** | **298** |

(`compile-err` mutants are mutations TypeScript rejects before they ever run; they're excluded from the score formula. Mutation score = killed / (killed + survived + no-coverage).)

Ratchet plan: once the suite stays above the current break + 5 points consistently across several PRs and nightly runs (i.e., observed ≥ 32%), raise the threshold by 5 points in a small follow-up PR. The bigger lifts will come from (a) redesign Phase 1 retiring `generatePrompt.ts`, (b) test strengthening on `getStateData.ts` (99 survived mutants is real test-quality signal), and (c) redesign Phases 5 and 9 bringing the state-rules and BYOK files into scope under the same gate.

Survived mutants must be resolved by one of: (a) a new test that kills the mutant, (b) marking it equivalent (the mutant doesn't actually change observable behavior) with a `// stryker disable next-line <mutator>` comment that names the reason, or (c) accepting it temporarily in a follow-up issue. Do NOT delete or weaken existing tests to inflate the score.

CI workflow: `.github/workflows/mutation.yml`. Triggers on PRs to `launch/production` whose changes touch a scoped path (or the Stryker config), nightly at 04:00 UTC to surface drift, and on manual dispatch. The job is named `mutation`; once branch protection is updated to require it, mutation-score regressions on scoped paths block merge.

Branch protection update (one-time, manual GitHub UI step, performed by repo admin after this guardrail lands): add `mutation` as a required status check for `launch/production`, alongside the existing `test` and `e2e` requirements.

Full detail and scope-expansion plan: `.ai/work-packets/tdd-phase-2-mutation-testing.md`.

## Boundaries

TDD as defined here does NOT cover:

- **Visual regression** — baseline-diffing rendered UI. Deferred to TDD Phase 3 (`tdd-phase-3-visual-regression-and-thresholds.md`); waits for the redesign to land.
- **Agentic QE (AQE)** — advisory evaluator tooling. Deferred to TDD Phase 4 (trigger-based, no packet drafted). See `qe-tooling.md` for the AQE posture.
- **Coverage thresholds and pre-push hooks** — Phase 3 territory.

The Willison ritual + red-phase script + CI gate + branch protection + mutation testing on high-stakes paths together form the foundation. Later phases build on it.
