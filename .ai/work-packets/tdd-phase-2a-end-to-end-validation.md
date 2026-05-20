# Work Packet: tdd-phase-2a-end-to-end-validation

Status: ready
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 2a (end-to-end validation, prerequisite to closing out the rollout)
Branch: launch/production (with sub-branches for the test PRs)

## Intent

Prove end-to-end that the TDD + Stryker gates actually block what they should and allow what they should, via **real PRs against `launch/production`** — not admin-bypassed pushes. Up to this point everything in the rollout has been configured and verified in isolation, but never battle-tested against an actual merge attempt. This packet stresses each gate with deliberately broken changes, observes whether the gates fire, then merges one clean change to validate the green path. Outcome: either confirms the system works or surfaces real gaps to fix before any feature work proceeds.

## Original User Intent

From the planning session (2026-05-20):

> "What I want to know at a high level is: does our TDD red-green testing suite automation and the enhancements we added with the Stryker mutation testing work end-to-end before we even start developing any additional features or any other enhancements?"

> "Now you mentioned that there are some actual known gaps, so I don't think that we're actually done with this phase until it's completely closed out."

## Intent Interpretation

We've shipped a lot of *configuration* across TDD Phase 1, the template/backfill mini-task, and Phase 2 (Stryker) — and validated the pieces work in *isolation*. But:

- Every push to `launch/production` so far has been admin-bypassed (`Bypassed rule violations` in remote messages). The gates have never actually blocked anything.
- `mutation.yml` has never run on GitHub Actions infrastructure (only on the subagent's local machine for the baseline).
- We don't know that a deliberately broken PR would be caught.
- We don't know that a clean PR can actually merge through the gates as designed.

**The validation principle:** a gate that has never been observed firing against a real attempt is an unverified gate. Until it fires (in either direction — blocking bad work, allowing good work), we have configuration but not protection.

This packet executes four small PR cycles against `launch/production`, each targeting one gate behavior. The "should block" PRs are observed and closed without merging (the point is to see the block, not bypass it). The "should pass" PR is a real test-strengthening improvement: the worker picks one survived mutant from the Stryker baseline report, writes a test that would kill it (Willison ritual), and merges. That last PR is both the green-path validation AND an organic demonstration that the system is usable as intended.

**Why this is "Phase 2a, not Phase 3":** The numbering reflects that this is the validation step for Phases 1 + 2 — it's a prerequisite for closing the rollout, not new functionality. TDD Phase 3 (visual regression + coverage thresholds + pre-push hook) is genuinely later work and remains queued.

## Business Logic

Rules:

- **No admin bypass on any PR in this packet.** The whole point is to validate the gates work against non-admin merge attempts. The PRs must be merged through the GitHub UI's normal flow, not via `git push` to `launch/production`. If a "should pass" PR can be merged via the UI with a green button, the gate works. If it can't, the gate is misconfigured.
- **"Should block" PRs must be CLOSED, never merged.** Their purpose is to observe the block. Merging a deliberately broken PR — even with override — defeats the validation and pollutes `launch/production`.
- **Each test PR must be on its own feature branch off `launch/production`** with a descriptive name (e.g., `validate/test-gate-lint-failure`, `validate/mutation-gate-hollow-test`, `validate/clean-merge-strengthen-rate-limit-tests`).
- **The "should pass" PR must make a REAL improvement**, not a no-op. Specifically: strengthen one test for a previously-survived mutant from the Stryker baseline. This validates the entire intended ritual — Stryker report → identify gap → write killing test → confirm mutant is killed → merge.
- **Document every observation in this packet's Evidence Plan section** after execution. Each PR's CI status, the merge-button state, what the gate caught (or missed) — written down as ground truth.
- **If a gate doesn't fire as expected, STOP and surface to the user.** Don't bypass to "make it work" — that defeats the validation. Fix the gate, re-run the affected test PR.

Assumptions:

- TDD Phase 1 + Phase 2 are shipped (commits `5967ced`, `6dfcf38`, `b40f626`, `176e150`, `d0f38ac` — confirmed in `git log`).
- Branch protection on `launch/production` requires `test` and `mutation` jobs.
- `mutation.yml` has NOT yet run on GitHub infrastructure — first run will be triggered by the first test PR (which touches a scoped path).
- The Stryker baseline mutation report is in `reports/mutation/mutation.html` locally (gitignored); the per-file scores and per-mutation survivors are documented in commit `d0f38ac`'s message and the TDD guardrail.
- GitHub admin bypass is available but must NOT be used in this packet's PRs.

User-confirmed decisions:

- Run all four test PR cycles before declaring Phase 1/2 closed.
- The "should pass" PR strengthens a test for one survived mutant — exact choice is worker's judgment, must be from the scoped files (`alignment.ts`, `budget.ts`, `rate-limit.ts`, `getStateData.ts`, or a generatePrompt internal — though generatePrompt is being retired by redesign Phase 1; pick one of the others).
- Validation findings update both the project brief and the TDD guardrail.

Edge cases:

- **A "should block" PR isn't actually blocked.** Indicates a real misconfiguration. Surface to user; do not proceed until fixed.
- **A "should pass" PR can't be merged due to unrelated CI flakiness.** Re-run jobs first; if still failing, investigate as a separate concern (might be a Phase 1a issue surfacing).
- **The mutation workflow takes 5+ minutes per run** (we saw ~5m37s locally). PR cycles will be slow. Patience.
- **`mutation` job has `app_id: None` in branch protection currently.** Once mutation.yml runs once, GitHub will populate the app_id and the gate becomes active. The first PR's job IS the registration moment.
- **A "should block" PR turns out to ALSO trigger a different gate.** E.g., a deliberately failing test that also fails lint. Document both, but design the PRs so each isolates one gate where possible.
- **A clean PR's mutation score regresses unexpectedly.** Worker should re-examine — did the strengthening actually kill the mutant? If the score drops below threshold, the gate correctly blocks.

Out of scope:

- E2E gate validation (separate concern; Phase 1a covers e2e CI compat).
- Modifying any source code OTHER than the test-strengthening for the "should pass" PR.
- Adding new test infrastructure or tools.
- Changing the mutation threshold or the scoped paths in this packet.
- Redesign work, Phase 1a investigation, or Phase 3 setup.
- Marketing claims about Willison's pattern (those need more data than one validation; this packet doesn't try to settle that).

## Commercial Readiness

Applicability: not applicable (meta-validation work — protects future commercial work but isn't commercial itself)

Lanes in scope:

- operational/reliability — proves the safety harness works

User decisions needed:

- none before execution; surface only if a gate misbehaves

Assumptions:

- The user can review PRs as the non-admin reviewer (alternative: a second account or just observation; if Muxin is the only collaborator with admin, the validation still works because non-admin merge attempts produce the same gate signals — branch protection rules don't depend on who's clicking)

## Operational Reproducibility

Setup:

- No new dependencies
- `git checkout launch/production && git pull` before creating sub-branches

Configuration:

- No new env vars or config files

Provider setup:

- GitHub (already configured)

Infrastructure/deployment:

- Test PRs use the existing `test.yml` and `mutation.yml` workflows
- Branch protection rules already in place

Database migrations:

- not applicable

Manual steps:

- Open 4 PRs via `gh pr create` or GitHub UI
- Observe each PR's status (CI tabs, merge button, branch-protection messages)
- Close PRs 1-3 without merging
- Merge PR 4 via the GitHub UI's normal merge button (not via `git merge` + push, since admin push bypasses protection)
- Document each PR's outcome in this packet's Evidence Plan

Verification:

- Each test PR's GitHub Actions runs visible
- Each PR's merge-button state observable
- Final state: project brief + TDD guardrail updated with validation outcomes

Test quality:

- Validation is observational; no new test code in this packet's infrastructure (the test PRs' content IS the test of the gates)

Critical logic trigger:

- This packet validates the critical logic gates (test + mutation) themselves

## Scope

Touch:

- Four feature branches off `launch/production` (created during execution)
- The "should pass" PR touches one test file in `src/lib/` (the survived-mutant target)
- After-action: `.ai/project-briefs/tdd-rollout.md` (validation outcomes recorded)
- After-action: `docs/ai-coding-practices/guardrails/test-driven-development.md` (note that the gates were validated; date + commit references)

Do not touch:

- Any source code outside the "should pass" PR's chosen test file
- `mutation.yml`, `test.yml`, `stryker.config.json`, or other Phase 1/2 infrastructure (validating, not modifying)
- Branch protection rules (already configured)
- Other work packets
- `main` branch
- Any redesign packet's scope

## Ownership Audit

Concern: validation of the TDD + Stryker gate system end-to-end
Existing owner: none for validation specifically (Phase 1/2 packets own the gates; this packet owns proving they work)
Neighboring owners:

- TDD discipline: `docs/ai-coding-practices/guardrails/test-driven-development.md`
- CI workflows: `.github/workflows/test.yml`, `.github/workflows/mutation.yml`
- Branch protection: GitHub repo settings (configured via `gh api`)

Files/modules/docs inspected:

- This packet
- Phase 1 + 2 packets for context on what was shipped
- The Stryker baseline report (the survived-mutant catalog for the "should pass" PR choice)
- `.github/workflows/test.yml` + `mutation.yml` for trigger conditions

Reuse/edit targets:

- Update the project brief's Phase 1 + 2 status from "SHIPPED" to "SHIPPED + VALIDATED end-to-end (Phase 2a, commit <ref>)"
- Add a "Validation history" sub-section to the TDD guardrail noting when each gate was confirmed firing

New owner needed:

- no — this is one-time validation work

Overlap/bloat risks:

- Test PRs could be confused with real feature work. Mitigation: branch naming convention `validate/...`; PR titles prefixed `[validate]`; close non-merging PRs immediately after observation.
- Polluting `launch/production` with the closed PRs' branches. Mitigation: delete branches after closing/merging.

Recommendation:

- Execute the four PR cycles in sequence (not parallel — observing one at a time makes findings cleaner). Document each before moving to the next. If any gate misbehaves, stop and fix before continuing.

Execution constraints:

- Worker MUST NOT use admin bypass on any PR in this packet
- Worker MUST close "should block" PRs without merging
- Worker MUST document each PR's outcome before moving to the next
- Worker MUST delete the feature branches after closing/merging
- Worker MUST surface to the user immediately if a gate fails to fire as expected

## Acceptance Criteria

### Gate-level proofs

- **PR #1 (lint failure):** opens a feature branch with one deliberate lint violation (e.g., unused variable that triggers `next lint`). PR is opened, CI runs, `test` job fails on lint. GitHub UI shows merge button disabled with "Required statuses must pass before merging." PR is closed without merging. Branch deleted.
- **PR #2 (failing test):** opens a feature branch that modifies an existing test to assert something false (e.g., changes `expect(x).toBe(true)` to `expect(x).toBe(false)`) on a passing test. PR opened, CI runs, `test` job fails on vitest. Merge button disabled. PR closed. Branch deleted. (Pick a test where flipping doesn't accidentally also fail lint — keeps the gate isolated.)
- **PR #3 (mutation gate):** opens a feature branch adding a small NEW function to a scoped file (e.g., a helper in `src/lib/server/budget.ts`) with a deliberately hollow test (`expect(result).toBeDefined()`). PR opened, CI runs, `test` job PASSES (the hollow test is valid), `mutation` job FAILS (the new code's mutations survive). Merge button disabled showing both required-status checks; the failing one is `mutation`. PR closed. Branch deleted.
- **PR #4 (clean merge):** opens a feature branch that picks one survived mutant from the baseline report and writes a test that would kill it. Uses the Willison ritual: write test, run `bash scripts/ai-tdd-red.sh <test-file>`, confirm RED, then the "implementation" (the test itself becomes the killing assertion); confirm GREEN; run npm test full suite; run `bash scripts/ai-mutation-check.sh` and confirm mutation score is the same OR better than baseline. PR opened, CI runs, BOTH jobs green. Merge button enabled. **PR merged via the GitHub UI** (no admin bypass). After-merge: mutation re-run confirms the previously-survived mutant is now killed.

### System-level proofs

- All four PR runs captured in GitHub Actions (visible URLs documented in Evidence Plan)
- Branch protection's "required status checks" UI shown firing correctly (screenshot or `gh pr view` output captured)
- After PR #4 merges, GitHub Actions shows that subsequent pushes to `launch/production` are gated by both `test` and `mutation` jobs (i.e., `mutation` is no longer `app_id: None` — it's populated with the real app_id from the workflow run)
- Project brief updated with validation outcomes (Phase 1 + 2 status changed to "SHIPPED + VALIDATED end-to-end")
- TDD guardrail gains a "Validation history" sub-section documenting which commits validated which gates

### Negative-case discoveries

- Any gate that DIDN'T fire as expected is documented as a real Phase 2a finding requiring a follow-up packet (don't paper over)
- Any unexpected behavior (e.g., merge worked when it shouldn't have, or didn't when it should have) is captured verbatim in the Evidence Plan

## Test Plan

This packet's "tests" are observations of the gates firing. There are no traditional unit tests being added.

| AC | Observation artifact | Test shape |
|---|---|---|
| PR #1 — lint gate blocks | GitHub Actions run + PR UI screenshot | `test` job exits non-zero on lint step; PR merge button shows "Required statuses must pass" |
| PR #2 — test gate blocks | GitHub Actions run + PR UI screenshot | `test` job exits non-zero on vitest step; PR merge button shows "Required statuses must pass" |
| PR #3 — mutation gate blocks | GitHub Actions run + PR UI screenshot | `test` green, `mutation` red; PR merge button shows "Required statuses must pass" |
| PR #4 — clean PR merges | GitHub Actions run + PR UI screenshot + post-merge mutation rerun | both jobs green; PR merge button enabled; merge succeeds via UI; post-merge mutation report shows the previously-survived mutant is killed |
| mutation app_id populated | `gh api .../branches/launch%2Fproduction/protection` | `required_status_checks.checks[].app_id` for `mutation` is non-null after PR #4 |
| project brief updated | git diff on `.ai/project-briefs/tdd-rollout.md` | Phase 1 + 2 entries show "VALIDATED" + Phase 2a packet reference |
| guardrail validation history | git diff on `docs/ai-coding-practices/guardrails/test-driven-development.md` | new sub-section listing each gate's first-fire commit/date |

### Validation ritual for this packet

Execute PRs in sequence (not parallel). For each:

1. Create feature branch off `launch/production`: `git checkout -b validate/<name>`
2. Make the deliberate change (or, for PR #4, run the Willison ritual)
3. Push the branch: `git push -u origin validate/<name>`
4. Open the PR: `gh pr create --base launch/production --head validate/<name> --title "[validate] <description>" --body "Phase 2a validation: <which gate>"`
5. Wait for CI: `gh pr checks <PR-number>` or visit Actions tab
6. Observe + screenshot the gate behavior
7. Document the observation in this packet's Evidence Plan
8. Close (or merge, for PR #4): `gh pr close <PR-number> --delete-branch` (for PRs 1-3) or merge via UI (for PR #4)

For PR #4 specifically, the test-strengthening Willison cycle:

1. Read `reports/mutation/mutation.html` locally (or re-generate via `npx stryker run`)
2. Pick a survived mutant from a scoped file (suggested target: `rate-limit.ts` L5 `isProduction` boundary, or one of `budget.ts`'s string-literal survivors)
3. Write a new test case in the corresponding `.test.ts` file that exercises the boundary the mutant violates
4. Run `bash scripts/ai-tdd-red.sh <test-file>` — confirm exit 0 + the failure output. (The test should currently fail because the assertion is too strong for the existing test pattern, OR because it covers a code path not yet hit. Note: this red phase is subtle — the test exists to kill a mutation, not because new product code is being added. Worker should aim for: "the test asserts on behavior X; that behavior is currently satisfied by the implementation; before the test existed, the assertion wasn't being made anywhere; the test goes RED if I temporarily revert the implementation to the mutated form.")
5. If step 4's red-phase doesn't cleanly fire, the worker may need to use a slightly different strengthening pattern — document the choice
6. Implement (or in this case, the implementation already exists; this is purely a test addition that strengthens the existing tests)
7. Run `bash scripts/ai-mutation-check.sh` locally — confirm the targeted mutant is now killed and overall score is unchanged or improved
8. Open the PR

## Evidence Plan

Visual evidence (captured during execution):

- Screenshot of each PR's "Files changed" tab showing the deliberate change
- Screenshot of each PR's "Checks" tab showing CI job results
- Screenshot of each PR's "Conversation" tab showing the merge-button state + branch-protection message
- Screenshot of GitHub Actions runs for `test.yml` and `mutation.yml` for each PR
- Screenshot of branch protection settings AFTER PR #4 showing `mutation` with non-null app_id

Behavior evidence:

- For each PR: captured `gh pr checks <PR>` output showing which checks passed/failed
- For PR #4: captured `git log` showing the merge commit on `launch/production` resulted from the PR merge (not a direct push)

Business logic evidence:

- Rule "deliberate lint failure blocks merge" → observed: PR #1's `test` job failed on lint; merge button disabled; PR closed without merging
- Rule "deliberate test failure blocks merge" → observed: PR #2's `test` job failed on vitest; merge button disabled; PR closed
- Rule "hollow test allows code but mutation gate blocks" → observed: PR #3's `test` green, `mutation` red; merge button disabled; PR closed
- Rule "clean PR with proper tests merges" → observed: PR #4's both jobs green; merge button enabled; merge succeeded; mutation score improved

Persistence evidence:

- After-merge `git log` shows PR #4's merge commit on `launch/production`
- `mutation.html` regenerated after PR #4 shows the killed mutant marked as Killed (not Survived)

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- operational/reliability lane: the safety harness is now battle-tested

Operational evidence:

- All four PR runs visible in https://github.com/heymoosh/voter-choice/actions
- Branch protection rules reflected in `gh api .../branches/launch%2Fproduction/protection` output

Integration evidence:

- The whole pipeline (commit → push → CI runs → branch protection enforces → merge decision) ran end-to-end for each PR

Regression evidence:

- `launch/production` has not been polluted with deliberately broken code (PRs 1-3 closed without merging)
- PR #4's merge improves mutation score (or maintains it)

Proof standard:

- A reviewer can: (a) read each PR's URL; (b) observe the gate behavior matches the AC; (c) check that no deliberately-broken code was merged; (d) confirm the project brief and guardrail were updated; (e) see that mutation gate is now fully active (`app_id` populated)

Non-proof:

- "I confirmed the gates work" without GitHub Action URLs and PR references
- "PR #X was blocked" without screenshot/output capturing the blocker
- "Mutation score improved" without before/after numbers from the actual Stryker reports

## Anti-Solutions

- Do NOT use admin bypass on any PR — defeats the entire validation
- Do NOT merge PRs 1, 2, or 3 — they're deliberately broken; merging pollutes `launch/production` and the deploy workflow would then ship broken code to production
- Do NOT make the "should pass" PR a no-op or a comment-only change — must demonstrate a real Willison ritual cycle with a test-strengthening payoff
- Do NOT skip documenting unexpected behaviors — every "I think this is fine" without observation is a future bug
- Do NOT change `stryker.config.json` to lower the threshold so PR #3 doesn't fail — the gate must fire on its current configuration
- Do NOT change `test.yml` to ignore the lint step — same reason
- Do NOT batch PRs (e.g., one PR that tests all three blocks simultaneously) — observations should be isolated
- Do NOT delete the screenshots or evidence after capture; they go in the Evidence Plan
- Do NOT consider this packet complete until ALL four PR outcomes are documented in the Evidence Plan, even if one doesn't behave as expected — the failures ARE the most valuable findings

## Notes

**Why this matters:** A safety harness that's never been pulled is theatre. Phases 1 + 2 produced infrastructure; this packet produces evidence the infrastructure works. The redesign work that follows depends on these gates catching mistakes — if the gates are silently broken, every redesign packet is at risk.

**Sequencing relative to other queued work:** Phase 2a should land BEFORE Phase 1a (e2e CI compat) and BEFORE redesign Phase 1 (prompt refactor). Reasons:
- Phase 1a's success is itself a gate-validation exercise (does fixing e2e make the e2e job actually pass in CI?); having Phase 2a validate the core gates first means we're isolating "is this CI environment-stable" from "do the gates fire correctly"
- Redesign Phase 1 will ship under the gates — we want to know they work before we trust them with the highest-stakes redesign code

**What the four PRs cost:** ~30-45 minutes of CI time across the four, mostly mutation runs (~5 min each). Each PR's manual observation + documentation is ~5-10 min. Total: roughly 1-2 hours of clock time but mostly waiting for CI, ~30 min of active orchestrator work.

**The "should pass" PR's target choice:** the Stryker baseline highlighted three illustrative survived mutants:
- `rate-limit.ts` L5 `isProduction` boundary (`ConditionalExpression` flipped) — clean to test by adding NODE_ENV variation
- `budget.ts` L53 `StringLiteral` empty-string survivor — tests assert structure but not exact literals
- `getStateData.ts` L64-65 `StringLiteral` empty-string survivors — 99 total in this file; pick one specific assertion

`rate-limit.ts` is probably the cleanest target because the test addition is unambiguous (assert behavior under both NODE_ENV values).

**The mutation workflow's first real run will happen during PR #1** (since PR #1's files won't match the scoped paths, mutation may NOT trigger on PR #1; it WILL trigger on PR #3 which adds code to `budget.ts`). Worker should expect:
- PR #1, #2: only `test` runs (mutation paths-filter doesn't match)
- PR #3, #4: both `test` and `mutation` run

This is actually intentional — the paths-filter on `mutation.yml` saves CI minutes by only running Stryker when the scoped paths change.

**If `mutation` job's `app_id` stays `None` after PR #3:** GitHub may need explicit re-recognition. Try `gh api -X PUT repos/heymoosh/voter-choice/branches/launch%2Fproduction/protection --input <(echo '{"required_status_checks": {"strict": true, "contexts": ["test", "mutation"]}, ...}')` to re-PUT the same config — GitHub re-resolves contexts at PUT time. Document if this happens.

**Post-validation, update the brief:**

```
- `.ai/work-packets/tdd-phase-1-core-discipline.md` — TDD Phase 1: ...  
  Status: SHIPPED + VALIDATED end-to-end 2026-MM-DD via Phase 2a (commit <ref>).
- `.ai/work-packets/tdd-phase-2-mutation-testing.md` — TDD Phase 2: ...
  Status: SHIPPED + VALIDATED end-to-end 2026-MM-DD via Phase 2a (commit <ref>).
- `.ai/work-packets/tdd-phase-2a-end-to-end-validation.md` — TDD Phase 2a: ...
  Status: <ready | in-progress | shipped>
```
