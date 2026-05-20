# Work Packet: tdd-phase-3-visual-regression-and-thresholds

Status: ready (blocked-on `tdd-phase-1-core-discipline`; visual baselines also blocked-on redesign Phase 4)
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 3 (Visual regression + coverage thresholds + pre-push hook)
Branch: launch/production

## Intent

Round out the TDD rollout with three additions: (a) Playwright visual regression for the redesigned UI, baselined post-redesign and committed in-repo; (b) coverage thresholds in `vitest.config.ts` so PRs that drop coverage fail; (c) a pre-push hook that runs the full test suite (not just staged) so "I committed clean but broke something unrelated" gets caught before push. Plus a coverage badge in the README and a guardrail doc covering visual regression workflow + baseline-update process.

## Original User Intent

From the planning session (2026-05-19):

> "Visual regression with playwright is also something to continue. … On the phase three scope changes, I think that we need to redesign first and then baseline against a new state, because our current design is terrible."

> "We can store playwright in the repo if that's easier. That's fine."

> "Phase three includes visual regression with playwright, coverage thresholds, etc., all those other things that you mentioned needing to include."

## Intent Interpretation

Visual regression catches the UI-level equivalent of mutation testing's logic-level catch: pixel-level changes that no unit/component test would notice. For the redesign, this matters — Phase 4 (text-first cards) and Phase 7 (printable PDF) are pixel-sensitive, and a refactor that "passes all tests" but accidentally inverts a color or shifts a layout would still ship without visual regression.

The "redesign first, then baseline" decision is sound: capturing baselines against the current UI would just lock in artifacts we're about to discard. Phase 3 ships the *tooling* immediately after Phase 1 + Phase 2; the *baselines* are captured incrementally as redesign packets land. Each redesigned screen gets a baseline-capture step in its own packet's verification.

Coverage thresholds + pre-push hook are smaller wins that round out the gate stack:

- Coverage thresholds: catch tests that don't even hit the code they should. Set on changed/touched files only (not all source) to avoid breaking baseline at install time.
- Pre-push hook: catches the gap between pre-commit (staged) and CI (post-push). A worker who runs `git push --no-verify` can still push — but the default flow gets the safety net.

## Business Logic

Rules:

- **Visual regression baselines are in-repo, not in a vendor service.** Stored under `e2e/__screenshots__/` (Playwright's default) or a clear sibling directory. Per-route, per-viewport (desktop + mobile per `playwright.config.ts`).
- **Visual baselines are captured incrementally.** Each redesign packet (Phases 1-9) gains a verification step: "capture visual baseline for the screens this packet ships." This packet ships the *tooling* + *workflow*; the baselines accumulate.
- **A visual diff failure blocks merge.** Playwright's `toHaveScreenshot()` fails when pixel diff exceeds tolerance. Updating a baseline is a deliberate act (`npx playwright test --update-snapshots`) that produces a visible diff in the PR.
- **Diff tolerance per-route is allowed.** Some routes (e.g., chat with timestamps) have inherent variation; tolerance is tuned in the spec, not globally.
- **Coverage thresholds apply to changed files in a PR**, not the whole codebase. Initial threshold: 80% lines, 75% branches, 75% functions on changed files. Configurable in `vitest.config.ts` + a CI step that compares coverage delta.
- **Pre-push hook runs `npm run test`** (full suite, not staged) + `npm run build`. Slower than pre-commit; intentional. Workers who need to push WIP can `git push --no-verify`; default flow is safe.
- **Coverage and visual regression do NOT block experiment branches.** Same scoping rule as Phase 1's CI — `launch/production` only.
- **README gets a coverage badge** pulled from CI's coverage artifact. Lightweight; rebuilds on every test run.

Assumptions:

- TDD Phase 1 + 2 are shipped: CI workflow, branch protection, red-phase script, mutation gate all live.
- Playwright's `toHaveScreenshot()` API is stable in 1.52.0 (verify at packet grooming time; the API has been GA for a while).
- Baselines for the *current* design are skipped — only the redesigned UI gets baselined.
- The redesign packets (Phases 1-9) are sequenced after this packet's tooling lands; their verification steps include baseline capture.

User-confirmed decisions:

- Visual baselines stored in-repo (no Chromatic / Percy / vendor service).
- Baselines captured post-redesign, incrementally per packet.
- Coverage thresholds enforced in CI.
- Pre-push hook added (was originally "Phase 3 nice-to-have," now confirmed in scope).

Edge cases:

- A baseline diff is intentional (the UI was supposed to change): updating baselines requires running `--update-snapshots` and committing the new screenshots. The diff is visible in the PR; the reviewer signs off.
- Cross-platform rendering differences (font hinting, anti-aliasing on Mac vs Linux CI): captured baselines must come from the CI environment (Linux Chromium). Local developer captures will diff against CI baselines; document this.
- A redesign packet ships a screen that has dynamic content (timestamps, candidate photos): use Playwright's masking to exclude variable regions.
- A worker hits 100% coverage on a file by adding tautological tests just to hit a line: mutation testing (Phase 2) catches this — tautological tests get a low mutation score even with high coverage.
- A file is newly created with zero coverage: the changed-files threshold fails the PR immediately, forcing tests. Desired behavior.
- A worker uses `git push --no-verify` to skip the pre-push hook: documented as escape hatch for WIP pushes to feature branches; never appropriate for `launch/production`.

Out of scope:

- Cross-browser visual regression (only Chromium baselines in v1; Firefox / Safari deferred).
- Full-page screenshot comparison for every route (scoped to specific component-level screenshots in spec files).
- Test coverage on the e2e suite itself (only unit/component test coverage).
- Mutation testing for the visual regression workflow.
- Performance regression testing (Lighthouse CI is mentioned in `clean-start` script but not wired up — separate effort).
- Enabling AQE (Phase 4 deferred).

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX — visual regression catches inadvertent UI changes
- accessibility/responsive — desktop + mobile baselines via Playwright's existing projects
- observability/support — coverage badge surfaces test health publicly
- security baseline — pre-push hook catches "broke an unrelated file before pushing" cases that could hide a security regression

User decisions needed:

- Approval of the initial coverage threshold (80% lines on changed files) — defer to packet grooming
- Visual diff tolerance per-route — case-by-case as baselines are captured

Assumptions:

- Existing Playwright config (`playwright.config.ts`) is the baseline; this packet may extend `expect.toHaveScreenshot.threshold` or similar.

## Operational Reproducibility

Setup:

- `npm install` (no new deps; Playwright already installed)
- `chmod +x .githooks/pre-push`
- `git config core.hooksPath .githooks` (already configured if pre-commit works; verify)

Configuration:

- `vitest.config.ts` — add `coverage.thresholds`
- `playwright.config.ts` — extend with visual regression defaults (tolerance, snapshot dir)
- new `.githooks/pre-push` — pre-push hook
- new `e2e/visual/*.spec.ts` — visual regression spec files (one per redesigned screen, added incrementally)

Provider setup:

- no new providers

Infrastructure/deployment:

- `.github/workflows/test.yml` (Phase 1) extended to:
  - Generate coverage report (`npm run test:coverage`)
  - Upload coverage artifact (for the badge)
  - Compare changed-files coverage against threshold; fail if below
- Possibly a new `.github/workflows/visual.yml` if visual regression is heavy enough to deserve its own job
- README gets a coverage badge (using GitHub Actions artifact or a shields.io endpoint)

Database migrations:

- not applicable

Manual steps:

- One-time: confirm `git config core.hooksPath` is set (existing pre-commit hook implies it is)
- Per-packet (going forward): each redesign packet's verification includes "capture visual baseline" steps run in CI

Verification:

- `npm run lint`
- `npm run test`
- `npm run test:coverage` — generates coverage report
- `npm run build`
- `npm run e2e` — passes
- `npx playwright test e2e/visual/` — passes (once baselines exist)
- `bash scripts/ai-verify.sh`
- Pre-push hook fires on `git push`; runs full test suite

Test quality:

- Visual regression spec files include explicit masks for dynamic regions
- Coverage thresholds enforced on changed files only (not the whole codebase)

Critical logic trigger:

- product UX (the visual regression catch is user-visible)

## Scope

Touch:

- `vitest.config.ts` — add coverage thresholds
- `playwright.config.ts` — extend with visual regression defaults
- new `.githooks/pre-push` — pre-push hook
- `.github/workflows/test.yml` (Phase 1's workflow) — extend with coverage threshold check and artifact upload
- new `e2e/visual/` directory — visual regression spec files (placeholder spec at v1; populated as redesign packets land)
- `docs/ai-coding-practices/guardrails/test-driven-development.md` (Phase 1 + 2) — extend with Visual Regression section and Coverage Thresholds section
- new `docs/ai-coding-practices/guardrails/visual-regression.md` — dedicated guardrail for visual regression specifics (when to add baselines, how to update them, false-positive triage)
- `README.md` — add coverage badge
- `.gitignore` — possibly add `.playwright-mcp/` and other test artifact patterns

Do not touch:

- `main` branch
- `.github/workflows/deploy.yml` or ingest workflows
- `.github/workflows/mutation.yml` (Phase 2's territory)
- The 9 redesign packets directly — *but* they each gain a verification line in a separate template-update follow-up
- AQE-adjacent files
- Existing test files (other than coverage-driven additions)

## Ownership Audit

Concern: visual regression, coverage thresholds, pre-push hook
Existing owner: none for visual regression; `vitest.config.ts` for coverage (no thresholds set yet); `.githooks/pre-commit` for hooks (no pre-push yet)
Neighboring owners:

- TDD discipline: `docs/ai-coding-practices/guardrails/test-driven-development.md` (Phase 1)
- Mutation testing: `docs/ai-coding-practices/guardrails/test-driven-development.md` Mutation section (Phase 2)
- CI test gate: `.github/workflows/test.yml` (Phase 1)
- pre-commit hook: `.githooks/pre-commit`

Files/modules/docs inspected:

- `vitest.config.ts`
- `playwright.config.ts`
- `.github/workflows/test.yml` (Phase 1's, once shipped)
- `.githooks/pre-commit`
- `package.json`
- The 9 redesign packets (to understand which screens need baselines)
- Playwright visual regression docs
- README.md

Reuse/edit targets:

- Extend `vitest.config.ts` (don't fork)
- Extend `playwright.config.ts` (don't fork)
- Extend the TDD guardrail (don't fork)
- Reuse existing CI patterns

New owner needed:

- yes — `.githooks/pre-push`
- yes — `e2e/visual/` directory (visual regression specs)
- yes — `docs/ai-coding-practices/guardrails/visual-regression.md` (visual regression workflow)

Overlap/bloat risks:

- TDD guardrail growing too large with three sections (TDD, Mutation, Visual + Coverage). Mitigation: extract Visual Regression into its own guardrail; keep TDD guardrail focused on the core ritual + the rest as siblings.
- Coverage threshold check duplicating logic in CI vs locally. Mitigation: single command in `package.json` (e.g., `npm run coverage:check`) used by both.
- Two pre-push checks (existing project conventions and the new hook) creating confusion. Mitigation: only one pre-push hook; it runs the same `scripts/ai-verify.sh` (or a "full" variant) used elsewhere.

Recommendation:

- Ship the tooling + workflow + guardrails in this packet; baseline capture happens in subsequent redesign packets. Coverage thresholds set conservatively (80% on changed files) with explicit ratchet plan.

Execution constraints:

- Workers must NOT capture baselines against the current (pre-redesign) UI.
- Workers must NOT relax coverage thresholds below the initial values without a documented reason.
- Workers must NOT replace the pre-commit hook (it stays; pre-push is additive).
- Workers must NOT use `--no-verify` on pushes to `launch/production` — only feature branches.
- Workers must NOT add visual regression to e2e tests in v1 beyond an explicit `e2e/visual/` directory; keep the existing e2e suite focused on functional behavior.

## Acceptance Criteria

- `vitest.config.ts` has `coverage.thresholds` configured (e.g., 80% lines, 75% branches, 75% functions).
- `npm run test:coverage` runs and produces a coverage report.
- A PR with coverage below threshold on changed files fails CI (verified via a test PR with deliberately-untested code).
- `playwright.config.ts` has visual regression defaults configured (snapshot path, tolerance).
- `e2e/visual/` directory exists with at least a placeholder spec (e.g., a sample-baseline spec for the existing homepage as a smoke test of the tooling — not the redesigned UI).
- `.githooks/pre-push` exists and is executable. Runs the full `npm run test` + `npm run build` (or wraps `scripts/ai-verify.sh`). Exits non-zero on failure.
- New `docs/ai-coding-practices/guardrails/visual-regression.md` documents: when to add visual tests, how to update baselines (`--update-snapshots`), CI baseline vs local baseline, false-positive triage, masking dynamic regions.
- The TDD guardrail (Phase 1 + 2 doc) gains a brief Coverage Thresholds section linking to vitest config and a brief Visual Regression section linking to the new guardrail.
- `README.md` has a coverage badge.
- `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run build`, `npm run e2e`, `bash scripts/ai-verify.sh` all pass.

## Verification

- `npm run lint` clean.
- `npm run test` passing.
- `npm run test:coverage` passing with thresholds met.
- `npm run build` successful.
- `npm run e2e` passing.
- `npx playwright test e2e/visual/` passing (placeholder spec or any baselines that exist).
- `bash scripts/ai-verify.sh` passes.
- Pre-push hook fires on `git push` (verified by attempting a push of a deliberately-broken branch — push is blocked).
- Test PR with deliberately-untested code (coverage drop) fails CI.

## Test Plan

| AC | Test file / artifact | Test shape |
|---|---|---|
| Coverage thresholds enforced | `vitest.config.ts` + CI run | PR with untested new code fails the coverage step |
| Visual regression placeholder spec passes | `e2e/visual/sample.spec.ts` | `npx playwright test e2e/visual/sample.spec.ts` exits 0 |
| Visual regression catches diff | manual: open a PR that intentionally inverts a color on the existing homepage | the visual job fails; reviewer either updates baseline (deliberate) or fixes the regression |
| Pre-push hook runs full suite | `.githooks/pre-push` + manual test | `git push` against a broken branch is blocked |
| Coverage badge renders in README | `README.md` | manual: open README; badge visible |
| Visual guardrail doc explains workflow | `docs/ai-coding-practices/guardrails/visual-regression.md` | manual review: workflow documented |

### Red-phase ritual for this packet

Phase 3's red phase applies to:
- The pre-push hook's behavior (write test that asserts the hook blocks on failure; confirm red; implement; confirm green)
- The coverage threshold's enforcement (write test that asserts a low-coverage PR fails CI; confirm red via deliberately-untested code; implement threshold; confirm green)
- The visual regression placeholder spec (write the spec; confirm red because no baseline exists; capture baseline; confirm green)

Each is its own micro-cycle of the Willison ritual.

## Evidence Plan

Visual evidence:

- Screenshot of the coverage badge in README.
- Screenshot of CI failing on a coverage drop (deliberate test PR).
- Screenshot of CI failing on a visual diff (deliberate test PR).
- Screenshot of pre-push hook blocking a broken push (terminal output).

Behavior evidence:

- Captured pre-push hook output blocking a broken push.
- Captured visual regression failure + the diff image.
- Captured coverage threshold failure + the changed-file diff.
- Captured red-phase outputs for each micro-cycle.

Business logic evidence:

- Rule: "Coverage below threshold blocks merge" — observed CI failure on test PR.
- Rule: "Visual diff blocks merge" — observed CI failure on color-inversion test PR.
- Rule: "Pre-push hook runs full suite" — observed hook output before push.

Persistence evidence:

- Visual baselines committed in-repo at `e2e/__screenshots__/` (or chosen path).

Auth/security evidence:

- not applicable directly

Commercial readiness evidence:

- product UX lane: visual regression locks in the redesigned UI as it lands incrementally.
- accessibility/responsive lane: desktop + mobile baselines via Playwright projects.
- observability/support lane: coverage badge surfaces health publicly.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run build`, `npm run e2e` outputs.
- `bash scripts/ai-verify.sh` output.
- Pre-push hook trigger captured.

Integration evidence:

- Test PRs demonstrating each gate firing (coverage, visual diff, pre-push).

Regression evidence:

- All existing tests continue to pass; pre-push hook doesn't break existing workflows.

Proof standard:

- A reviewer can: (a) read the visual regression guardrail; (b) inspect the placeholder spec at `e2e/visual/`; (c) attempt a push with a broken test and see pre-push block it; (d) open a deliberately-low-coverage PR and see CI block; (e) see the README coverage badge update after a test run.

Non-proof:

- "Pre-push hook exists" without a test that confirms it blocks bad pushes.
- "Visual regression tooling is configured" without a placeholder spec demonstrating the workflow.
- "Coverage thresholds are set" without a CI run failing on a coverage drop.

## Anti-Solutions

- Do NOT capture baselines against the current (pre-redesign) UI. Baselines come incrementally with each redesign packet.
- Do NOT set coverage thresholds so high that the baseline test suite fails immediately (e.g., 95% on day one). Set conservatively; ratchet up.
- Do NOT enforce coverage thresholds on all source. Changed-files-only avoids breaking baseline at install time.
- Do NOT use a vendor visual regression service (Chromatic, Percy). In-repo baselines are simpler and don't add vendor dependency.
- Do NOT add visual regression to existing functional e2e specs. Keep `e2e/visual/` separate.
- Do NOT remove the pre-commit hook in favor of pre-push. Both run: pre-commit on staged, pre-push on full suite.
- Do NOT cross-browser baselines in v1. Chromium only; Firefox / Safari is a follow-up if/when relevant.
- Do NOT skip masking dynamic regions (timestamps, candidate photos) in visual specs. Flaky visual tests poison the gate.
- Do NOT capture local baselines as canonical — CI baselines are canonical; local diffs are advisory.

## Notes

- Playwright visual regression docs: https://playwright.dev/docs/test-snapshots — the `toHaveScreenshot()` API is the standard.
- The placeholder spec at `e2e/visual/sample.spec.ts` should screenshot a stable existing element (e.g., the homepage hero, *if* it survives the redesign) so the tooling can be smoke-tested before the redesign lands. Worker decides: pick something that won't churn.
- The coverage threshold can be expressed via `vitest.config.ts`:
  ```ts
  coverage: {
    thresholds: { lines: 80, branches: 75, functions: 75 },
  }
  ```
  For changed-files-only, a small CI step compares the coverage report against the changed-file list (extracted from `git diff --name-only origin/launch/production`).
- The pre-push hook can be minimal:
  ```bash
  #!/usr/bin/env bash
  set -e
  npm run test
  npm run build
  ```
  Or wrap `scripts/ai-verify.sh` for consistency.
- The coverage badge: simplest is to use a GitHub Actions artifact + a shields.io endpoint, e.g.:
  ```
  ![coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/heymoosh/voter-choice/launch/production/.github/badges/coverage.json)
  ```
  CI generates the JSON file from `coverage/coverage-summary.json` and commits it via a workflow step.
- Visual regression baselines for the redesigned screens accumulate as each redesign packet ships. Each redesign packet's verification gains a step: "capture visual baselines for the screens this packet introduces / modifies." That step is added when the template update happens (post-Phase-1 validation follow-up); the timing matches.
- After all three TDD phases land, the project brief moves to Status: shipped (with a note that Phase 4 / AQE remains deferred and trigger-based).
- Phase 4 (AQE) is intentionally NOT a drafted packet at this point. It's a placeholder in the brief; revisit when a concrete gap surfaces.
