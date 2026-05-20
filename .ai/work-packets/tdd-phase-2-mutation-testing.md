# Work Packet: tdd-phase-2-mutation-testing

Status: ready (blocked-on `tdd-phase-1-core-discipline`)
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 2 (Stryker mutation testing)
Branch: launch/production

## Intent

Add Stryker-based mutation testing to verify the *quality* of the test suite — specifically that tests on high-stakes logic would actually catch real bugs. Scope to a small set of critical paths (prompt routing + PII strip, state-rules table, budget logic, BYOK client). Wire a CI workflow that runs on PRs touching the scoped paths. Set an initial mutation-score threshold the suite can clear, with a ratchet plan to raise it over time.

## Original User Intent

From the planning session (2026-05-19):

> "Stryker mutation testing actually sounds pretty interesting, even if we defer. Can we follow up immediately after we set up the initial version of our new TDD red-green process?"

> "I actually have no idea what the timing is for Stryker. I was just saying that we should phase out this work because it seems very big… I'd refer to you on the timing, what makes the most sense to do these things."

> "I actually have no idea what mutation testing even is. I defer to you on what makes the most sense. The goal of mutation testing, of course, is just to make sure that our testing suite is robust and is actually helping us create code that does not cause regressions and does not cause failures."

## Intent Interpretation

### What mutation testing is (plain-language explanation for the user)

Regular tests check that your code does what it should. Mutation testing checks that your **tests** would notice if your code *stopped* doing what it should.

The mechanic: a mutation testing tool takes your production code and makes tiny harmful changes ("mutants") — flips a `>` to `>=`, changes `&&` to `||`, removes a `!`, returns `null` instead of a value. For each mutant, it re-runs your test suite.

- If a test **catches** the mutant (fails), the mutant is "killed." Good — your tests would have caught that bug in real code.
- If a test **doesn't catch** the mutant (everything still passes), the mutant "survived." Bad — your test suite has a blind spot.

The **mutation score** is the percentage of mutants killed. A high score (80%+) means your suite has high *test quality*: tests don't just hit code paths, they assert on outcomes that would fail under realistic bugs.

It's slow (re-runs the suite for every mutation), so we scope it tightly — only the *highest-stakes* code where a regression would actually hurt users. For this repo, those paths are: prompt routing + PII strip (security + AI contract), state-rules table (correctness — wrong ballot = wrong vote), budget logic (cost overruns), BYOK client (key leakage).

### Why this is Phase 2 (timing rationale)

The user asked for timing guidance. My recommendation: **Phase 2 lands before redesign Phase 1 (prompt refactor) starts.**

Rationale: prompt routing + PII strip are exactly the kind of logic where a test that *looks* solid can be hollow (asserting on the existence of a tag without checking its contents; mocking the PII strip to always return clean output). The mutation testing wave catches that *while the tests are being written* — not bolted on weeks later when the code has shipped. The earlier we install the test-quality gate, the cheaper it is to write strong tests from day one.

So the order is: TDD Phase 1 (discipline) → TDD Phase 2 (mutation) → redesign Phase 1 (prompt refactor under both gates). TDD Phase 3 (visual + thresholds + pre-push) can land in parallel with redesign work, except for the visual baselines which wait until redesign Phase 4.

### What this packet actually does

1. Install Stryker + Vitest runner + TypeScript checker.
2. Author `stryker.config.json` scoped to the four high-stakes paths.
3. Set an initial mutation score threshold of 60% (tunable — start low to make CI pass against existing tests, ratchet up as suites strengthen).
4. Add `.github/workflows/mutation.yml` that runs Stryker on PRs that touch the scoped paths (and nightly). Output mutation report as a CI artifact.
5. Author `scripts/ai-mutation-check.sh` to wrap Stryker locally with the same configuration.
6. Document mutation testing in the TDD guardrail (extends the doc from Phase 1).
7. Establish a ratchet practice: when the suite hits the threshold consistently, raise it by 5–10 points in a follow-up PR.

## Business Logic

Rules:

- Mutation testing runs only on **scoped paths** in v1. Full-repo mutation is too slow and too noisy.
- The scoped paths in v1: `src/lib/prompts/**`, `src/lib/state-rules/**`, `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`, `src/lib/anthropic-client-byok.ts` (the latter lands as part of redesign Phase 9; until then, the path is reserved in config).
- Initial mutation-score threshold: 60%. This is conservative — the existing tests are good but not exhaustively mutation-strong. The threshold ratchets up over time.
- Mutation workflow runs on `pull_request` to `launch/production` when scoped paths change, AND on a nightly cron for full-coverage reporting.
- Mutation failure (score below threshold) blocks merge to `launch/production` for PRs touching scoped paths. Branch protection is updated to include the `mutation` job alongside `test` and `e2e`.
- Survived mutants must be either (a) caught by a new test, (b) deemed equivalent (the mutant doesn't actually change behavior — rare but real), or (c) explicitly excluded via a code comment with reason.
- No mutation testing on test files themselves — only production code.
- No mutation testing on generated files (`src/lib/generated/*`).
- Mutation reports are CI artifacts; persistent in GitHub Actions for 30 days; key metrics surfaced in PR summaries.

Assumptions:

- TDD Phase 1 is shipped: `.github/workflows/test.yml`, `scripts/ai-tdd-red.sh`, the TDD guardrail, the AGENTS.md update — all in place.
- The validation task ("limited data notice") shipped successfully in Phase 1, demonstrating the discipline works on real code.
- Stryker 8.x is the current major release and is compatible with Vitest 3.2.1 (assumption to verify at install time).
- The repo's Node 22 / `engines` constraint in `package.json` is compatible with current Stryker.

User-confirmed decisions:

- Stryker is the chosen mutation testing tool (no other options considered — it's the standard for JS/TS).
- Phase 2 lands BEFORE redesign Phase 1 (prompt refactor) starts.
- Scoped to high-stakes paths in v1; full-repo mutation deferred indefinitely.
- Mutation results gate merges to `launch/production` (branch protection updated to require the `mutation` job).

Edge cases:

- Stryker takes too long (>15 minutes for a scoped run): cache TypeScript compilation; use Stryker's incremental mode; if still slow, narrow the scope further or move to nightly-only.
- Many "equivalent mutants" (mutations that don't change behavior): document each via a `// stryker disable next-line <mutator>` comment with reason; aggregated periodically.
- An equivalent mutant is missed and counts as survived: the threshold accounts for some noise; aim for 60% in v1 with full awareness that real test quality may be higher.
- TypeScript checker integration is unstable: fall back to no-checker mode; address in a follow-up.
- A PR touches a scoped path with a behavioral change but no new test — mutation testing surfaces the gap; PR is blocked until tests are added (this is the desired behavior).

Out of scope:

- Mutation testing on all production code (full-repo).
- Mutation testing on test files.
- Mutation testing on generated files.
- Mutation testing on data files (e.g., the state rules data table — the test is whether downstream logic correctly handles the data, which is what the scoped paths cover).
- Replacing Vitest, Playwright, or RTL with mutation-aware variants.
- Phase 3 work (visual regression, coverage thresholds, pre-push).
- Enabling AQE.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- security baseline — mutation testing catches gaps in BYOK / PII strip tests
- API/contracts — prompt router and `<ballot_context>` schema have machine-checked test quality
- business logic — state rules table correctness is mutation-checked
- observability/support — mutation reports surface test gaps publicly

User decisions needed:

- Approval of the initial threshold (60%) — defer until packet grooming
- Update branch protection to include the `mutation` job — manual GitHub UI step

Assumptions:

- The TDD discipline from Phase 1 produces tests that are at least somewhat mutation-resistant; if mutation score is significantly below 60% on day one, scope narrowing happens before the threshold gate goes live.

## Operational Reproducibility

Setup:

- `npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker`
- `chmod +x scripts/ai-mutation-check.sh`

Configuration:

- New `stryker.config.json` — Stryker config
- Possibly new `stryker.conf.cjs` if `.json` format is insufficient for advanced options
- New `.github/workflows/mutation.yml` — CI workflow

Provider setup:

- no new providers (Stryker runs locally and in CI)

Infrastructure/deployment:

- Mutation workflow runs on:
  - `pull_request` to `launch/production` when files matching `src/lib/prompts/**`, `src/lib/state-rules/**`, `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`, or `src/lib/anthropic-client-byok.ts` change
  - Nightly cron at e.g. `0 4 * * *` UTC (low-traffic time)
  - Manual dispatch for ad-hoc runs

Database migrations:

- not applicable

Manual steps:

- One-time: update GitHub branch protection to include the `mutation` job alongside `test` and `e2e`
- Documented in the TDD guardrail update

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `npx stryker run` — runs locally; reports mutation score
- `bash scripts/ai-mutation-check.sh` — wraps the local run with the same scoped config
- `bash scripts/ai-verify.sh`
- After merge: nightly cron run posts a mutation report; PR-triggered runs gate merges
- After branch protection update: a follow-up PR touching a scoped path shows the mutation job as a required check

Test quality:

- The mutation testing system has its own self-test: a deliberately weak test (e.g., a test that asserts `result !== null` only) should produce a low mutation score for the function under test. Document this as a sanity check.

Critical logic trigger:

- security baseline (BYOK + PII)
- business rule (state rules + budget)
- API/contracts (prompt routing)

## Scope

Touch:

- `package.json` — add Stryker devDependencies
- new `stryker.config.json` — Stryker config
- new `.github/workflows/mutation.yml` — CI workflow
- new `scripts/ai-mutation-check.sh` — local wrapper
- `docs/ai-coding-practices/guardrails/test-driven-development.md` (Phase 1 created; extend with a Mutation Testing section)
- Possibly `AGENTS.md` — add a brief reference to mutation testing under Verification
- Possibly `.stryker-tmp` to `.gitignore`

Do not touch:

- `main` branch
- `.github/workflows/test.yml` (Phase 1's workflow; mutation is separate)
- `.github/workflows/deploy.yml` or ingest workflows
- The 9 redesign packets (none should be in-flight during Phase 2 setup)
- `src/lib/generated/*` (excluded from mutation)
- `vitest.config.ts` (Phase 3 territory for coverage thresholds)
- AQE-adjacent files

## Ownership Audit

Concern: test suite quality (mutation score), high-stakes-path mutation gate
Existing owner: none (new concern)
Neighboring owners:

- TDD discipline: `docs/ai-coding-practices/guardrails/test-driven-development.md` (Phase 1)
- CI test gate: `.github/workflows/test.yml` (Phase 1)
- verification umbrella: `scripts/ai-verify.sh`

Files/modules/docs inspected:

- `package.json`
- `vitest.config.ts`
- Existing tests for the scoped paths (budget.test.ts, rate-limit.test.ts; prompts and state-rules tests don't exist yet — they'll be written in redesign Phase 1 / Phase 5)
- Stryker docs (Stryker Mutator official docs)
- `.github/workflows/test.yml`
- `docs/ai-coding-practices/guardrails/test-driven-development.md`

Reuse/edit targets:

- Extend the TDD guardrail (don't fork)
- Reuse the existing CI patterns from `test.yml` (setup-node, npm cache)
- Reuse `scripts/ai-verify.sh`-style wrapping for `ai-mutation-check.sh`

New owner needed:

- yes — `stryker.config.json`
- yes — `.github/workflows/mutation.yml`
- yes — `scripts/ai-mutation-check.sh`

Overlap/bloat risks:

- Two CI workflows (`test.yml` and `mutation.yml`) running on PRs: acceptable separation of concerns. Test workflow is fast (~5 min); mutation is slower (~10–20 min); keep them separate.
- `ai-verify.sh` and `ai-mutation-check.sh` could be confused: ai-verify covers regular green-and-passing; ai-mutation-check covers mutation score. Clearly named.
- Mutation report artifact retention: GitHub default is 90 days for artifacts. Set explicitly to 30 days to reduce storage.

Recommendation:

- Ship Stryker config + workflow + script + guardrail update in one packet. Single coherent diff.

Execution constraints:

- Workers must NOT remove or weaken existing tests to inflate the mutation score (e.g., deleting an "equivalent mutant" test that's actually catching something).
- Workers must NOT bypass the mutation gate via `continue-on-error: true` or similar.
- Workers must scope mutation testing in v1 to the five named paths only. Expansion is a follow-up packet.
- Workers must commit a sample run output / mutation report screenshot as Evidence.

## Acceptance Criteria

- Stryker is installed (`@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `@stryker-mutator/typescript-checker` in devDependencies).
- `stryker.config.json` (or `stryker.conf.cjs`) exists, scoped to the five high-stakes paths.
- `npx stryker run` (or equivalent local command) produces a mutation report with a per-file mutation score.
- `scripts/ai-mutation-check.sh` exists, is executable, wraps `npx stryker run` with the same config, exits 0 if score ≥ threshold and 1 otherwise.
- `.github/workflows/mutation.yml` exists with PR and nightly triggers, scoped to the five paths, uploads mutation report as an artifact, and the `mutation` job gates merge (when branch protection is updated).
- TDD guardrail (`docs/ai-coding-practices/guardrails/test-driven-development.md`) has a new Mutation Testing section with: what mutation testing is (plain language), the v1 scope, the threshold + ratchet plan, the survived-mutant resolution rules.
- A sample mutation run produces a score ≥ 60% on the existing scoped paths. If the existing tests are too weak to clear 60% on day one, the packet either (a) adds tests to clear it, or (b) starts at a lower threshold (50%) with a documented ratchet plan.
- AGENTS.md has a brief reference to mutation testing under Verification.
- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`, `bash scripts/ai-verify.sh` all pass.

## Verification

- `npm run lint` clean.
- `npm run test` passing.
- `npm run build` successful.
- `npm run e2e` passing.
- `bash scripts/ai-verify.sh` passes.
- `npx stryker run` produces a report; score ≥ 60% (or initial threshold if adjusted).
- `bash scripts/ai-mutation-check.sh` exits 0.
- A test PR touching a scoped path shows the `mutation` job running. After branch protection update: PR shows `mutation` as a required check.

## Test Plan

> Preview of the Test Plan section (still pending template update after Phase 1). Format: per-AC list of test file + assertion shape.

| AC | Test file / artifact | Test shape |
|---|---|---|
| Stryker config scoped to five paths | `stryker.config.json` | manual review: `mutate` array contains exactly the five named globs |
| Mutation score ≥ 60% on existing tests | `npx stryker run` output | report's overall mutation score ≥ 60% |
| `ai-mutation-check.sh` exits 0 when above threshold | `scripts/ai-mutation-check.test.sh` (bash) or fixture-based | given a passing config, expect exit 0 |
| `ai-mutation-check.sh` exits 1 when below threshold | same | given a config that artificially lowers threshold (e.g., 100%), expect exit 1 |
| CI workflow triggers on scoped-path PR | `.github/workflows/mutation.yml` | open a PR touching `src/lib/server/budget.ts`; observe `mutation` job in Actions |
| CI workflow does NOT trigger on unrelated PR | same | open a PR touching only `docs/`; observe `mutation` job is skipped |
| Mutation report uploaded as artifact | manual check | PR run's artifacts include the Stryker HTML report |
| Guardrail doc explains mutation testing | `docs/ai-coding-practices/guardrails/test-driven-development.md` | manual review: Mutation Testing section present, plain-language explanation included |

### Red-phase ritual for this packet

Phase 2 doesn't have a "production code change to validate" the way Phase 1 did. Instead, the red phase applies to the Stryker config + script:

1. Write `scripts/ai-mutation-check.test.sh` (or vitest fixture) testing both branches of `ai-mutation-check.sh` (above-threshold passes, below-threshold fails).
2. Run `bash scripts/ai-tdd-red.sh scripts/ai-mutation-check.test.sh`.
3. Confirm red (script doesn't exist yet, so tests fail).
4. Implement `ai-mutation-check.sh`.
5. Confirm green.
6. Run a sample mutation pass via `npx stryker run`; confirm the report generates and score is reported.
7. Adjust threshold based on observed score (don't set the threshold higher than what the existing tests can clear on day one).
8. Wire the CI workflow.
9. Open a test PR; observe mutation workflow runs.
10. Update branch protection (manual GitHub UI).

## Evidence Plan

Visual evidence:

- Screenshot of GitHub Actions tab showing the `mutation` job running on a test PR.
- Screenshot of the Stryker HTML report (uploaded artifact) showing per-file mutation scores.
- Screenshot of branch protection settings after the user updates with the `mutation` required check.

Behavior evidence:

- Captured red-phase output for `ai-mutation-check.sh` tests (from `ai-tdd-red.sh`).
- Captured `npx stryker run` output showing the mutation score on the existing scoped paths.
- Captured `bash scripts/ai-mutation-check.sh` output showing exit 0 on a passing run.

Business logic evidence:

- Rule: "Mutation score ≥ threshold" — observed Stryker output score ≥ configured threshold.
- Rule: "Scoped to five paths" — Stryker config's `mutate` array contains exactly the five globs.
- Rule: "Mutation gates merge" — PR touching a scoped path shows the required-status check on GitHub.

Persistence evidence:

- not applicable

Auth/security evidence:

- not applicable directly; mutation testing improves security baseline indirectly by catching weak tests on BYOK / PII paths.

Commercial readiness evidence:

- security baseline lane: mutation testing on `src/lib/anthropic-client-byok.ts` (once it exists, post-redesign Phase 9) provides test-quality evidence.
- API/contracts lane: prompt router (once it exists, post-redesign Phase 1) has mutation-checked test quality.

Operational evidence:

- All `npm run *` and `bash scripts/ai-*.sh` outputs captured.
- Stryker run output captured.
- CI workflow runs captured.

Integration evidence:

- A real PR opens, triggers the mutation workflow, generates a report, gates merge.

Regression evidence:

- All existing tests pass (the mutation pass doesn't *modify* committed code; it runs against in-memory mutants).

Proof standard:

- A reviewer can: (a) read the guardrail doc's Mutation Testing section and understand what it does; (b) inspect `stryker.config.json` and verify scope; (c) run `npx stryker run` locally and see a score; (d) observe a CI run on a test PR; (e) observe the required-status gate on a follow-up PR after branch protection is updated.

Non-proof:

- "Stryker is installed" without a sample run producing a report.
- "Score is high" without the actual report artifact.
- "Mutation gates merge" without an actual PR run.

## Anti-Solutions

- Do NOT scope Stryker to the full repo in v1. Performance + signal-to-noise will be unworkable.
- Do NOT set the initial threshold artificially high (e.g., 90%) to look impressive. Set it where existing tests can clear it; ratchet up over time.
- Do NOT add per-file `// stryker disable` comments en masse to inflate the score. Each exclusion must have a documented reason.
- Do NOT weaken or delete existing tests to make mutation pass. Strengthen them instead.
- Do NOT mutate generated files (`src/lib/generated/*`) or test files. Generated files are byproducts; test-file mutation is nonsensical.
- Do NOT block the existing `test.yml` workflow on mutation. They're separate concerns; mutation has its own workflow.
- Do NOT skip the manual branch-protection update — without it, the mutation gate is advisory only.
- Do NOT add Stryker plugins beyond the three named (core, vitest-runner, typescript-checker). Other plugins (e.g., HTML reporters via additional packages) can be added in follow-ups if needed.

## Notes

- Stryker's docs: https://stryker-mutator.io — refer to vitest-runner specifically for the integration shape.
- The five scoped paths are aspirational at Phase 2 ship time — `src/lib/prompts/**`, `src/lib/state-rules/**`, and `src/lib/anthropic-client-byok.ts` don't exist yet (they'll be created in redesign Phase 1, Phase 5, and Phase 9 respectively). For Phase 2, scope to what exists: `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`, plus any other obviously-critical existing files (`src/lib/generatePrompt.ts`, `src/lib/getStateData.ts`). The config's `mutate` globs can include not-yet-existing paths; Stryker will handle them gracefully.
- After redesign Phase 1 + 5 + 9 land, this packet's scope updates to add the new paths. That update can be a follow-up packet OR an inline edit to the Stryker config in those packets' diffs — orchestrator's call at the time.
- Initial threshold 60% is a guess. If the existing tests on `budget.ts` and `rate-limit.ts` are already very strong (likely — they're critical), the score may be 80%+ on day one. In that case, set the threshold higher; just don't set it ABOVE the actual observed score, or CI will fail immediately.
- The ratchet plan: after every redesign packet lands, observe the mutation score's overall trend. If it's stable above current threshold + 5 points, raise the threshold by 5 in a small follow-up PR.
- Equivalent mutants are a known limitation of mutation testing. Don't agonize over them in v1; document with `// stryker disable next-line <mutator>` and move on.
- Stryker takes time to run. PRs that don't touch scoped paths shouldn't trigger it. The workflow's `paths:` filter handles this.
- Nightly mutation runs surface drift between PRs (e.g., a refactor that didn't touch a scoped file but indirectly weakens its tests). Look for score drops in the nightly trend.
