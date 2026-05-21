# Work Packet: tdd-phase-2b-mutation-gate-deadlock-fix

Status: ready
Owner: orchestrator
Source: `.ai/project-briefs/tdd-rollout.md` — Phase 2b (mutation gate deadlock fix, surfaced by Phase 2a/PR #1)
Branch: launch/production

## Intent

Make `mutation.yml` always report a status on PRs to `launch/production`, regardless of whether scoped paths changed. Currently the workflow's `on: pull_request.paths:` filter causes the workflow to **not fire at all** on docs-only PRs (or any PR not touching scoped files), which means no status is reported, which deadlocks branch protection when `mutation` is set as a required check. This packet fixes the workflow so `mutation` can be re-added to required-status without blocking unrelated PRs.

## Original User Intent

Surfaced as a real finding during TDD Phase 2a / PR #1:

> User: "1 pending check ... mutation — Expected — Waiting for status to be reported — Required"

> Orchestrator: "`mutation` is stuck on 'Expected — Waiting for status to be reported'. That's because `mutation.yml` has a `paths:` filter that excludes the docs-only files PR #1 touches. The workflow never fires, so no status ever gets reported, so the required check never resolves. **This is a config bug in my branch-protection setup** — I added `mutation` as required without considering that the workflow's path filter means it sometimes won't fire at all."

## Intent Interpretation

GitHub Actions has a known behavior: when a required status check is configured at the branch-protection level, the corresponding workflow **must produce a status** for every commit/PR on the protected branch, or the gate deadlocks (PR shows "Waiting for status to be reported" forever).

The current `mutation.yml` uses `on: pull_request.paths:` to skip irrelevant PRs (which is correct for CI minute economy). But that conflicts with the protection requirement. The fix moves the path-filter logic **inside** the workflow:
- The workflow ALWAYS fires on `pull_request` to `launch/production`
- The job ALWAYS runs (and ALWAYS reports a status)
- Inside the job, a fast `dorny/paths-filter` step detects whether scoped paths changed
- If scoped paths changed → run Stryker (the expensive work)
- If they did not → emit a notice, exit 0, job reports "passed"
- Either way, `mutation` reports a status, branch protection is satisfied

This preserves CI minute economy (Stryker only runs when needed) while restoring the gate as a required check.

## Business Logic

Rules:

- `mutation` workflow must produce a status on every PR to `launch/production`. Either the actual Stryker result (when scoped paths changed) or a clean "skipped — no scoped changes" status. Both count as PASS for branch protection.
- The scoped-paths list in the workflow must stay in sync with `stryker.config.json`'s `mutate` array AND the same list in the workflow's previous `on.pull_request.paths` block. Drift between these will cause silent mismatches.
- The fast "detect" step uses `dorny/paths-filter@v3` (or equivalent) — pinned at a tag for supply-chain hygiene.
- Cron (nightly) and `workflow_dispatch` triggers always run full Stryker (no conditional skip) — both event types are explicit signals to do the heavy work.
- No `continue-on-error: true` anywhere.
- After this lands and the workflow demonstrates "skipped" status on a docs PR + "ran" status on a scoped-path PR, branch protection re-adds `mutation` to required-status via `gh api`.

Assumptions:

- `dorny/paths-filter@v3` (or later major tag) is stable and acceptable to use. It's a widely-used action with > 8M weekly downloads.
- "Skipped step" status counts as PASS for required-status purposes — confirmed by GitHub's documentation on required status checks.
- The Stryker workflow's cron + dispatch triggers continue to work unchanged.

User-confirmed decisions:

- Phase 2b ships before any redesign work begins (closes the harness gap before product work starts).
- Approach: workflow-side fix (path-filter moved inside the job), not a branch-protection-side fix (e.g., advisory-only mutation check).

Edge cases:

- **`dorny/paths-filter` requires `actions/checkout@v6` to have already run.** Place the filter step AFTER checkout. (Checkout is cheap; not a problem.)
- **`paths-filter` evaluates the PR's diff against the base branch.** For PRs into `launch/production`, that's the current state of launch/production — correct behavior.
- **What about pushes to `launch/production` directly?** `mutation.yml` doesn't have a `push:` trigger currently — only `pull_request`, `schedule`, and `workflow_dispatch`. After this packet, same triggers. Pushes don't trigger mutation (they trigger `test.yml` only). This is fine because branch protection only enforces the gate at MERGE time (which is the pull_request event).
- **What if a PR touches both scoped and non-scoped paths?** `paths-filter` reports the scoped filter as `true`, Stryker runs, status reflects the real result. Correct.
- **What if a PR's diff is empty (e.g., reverted commits)?** `paths-filter` reports all filters as `false`, mutation skips, status "passed (skipped)". Fine.

Out of scope:

- Restructuring Stryker config or threshold (Phase 2 territory; not this packet)
- Per-file mutation thresholds (Phase 2c-ish; deferred until a real need surfaces — Phase 2a flagged this as a future refinement but the current global break + per-mutant report is sufficient for now)
- Adding new scoped paths (incremental; happens as redesign Phases 1/5/9 land)
- Changes to `test.yml`, `deploy.yml`, or any other workflow
- Any code changes outside `.github/workflows/mutation.yml` and this packet

## Commercial Readiness

Applicability: not applicable (infrastructure work)

Lanes in scope:

- operational/reliability — restores the mutation gate

User decisions needed:

- none before execution
- one after merge: re-add `mutation` to required-status via `gh api`

Assumptions:

- The fix is small enough that the existing test gate (lint+test+build) is sufficient verification

## Operational Reproducibility

Setup:

- None — no new dependencies

Configuration:

- Single file change: `.github/workflows/mutation.yml`
- After merge: branch protection update via `gh api` (1 command)

Provider setup:

- GitHub Actions (already in use)

Infrastructure/deployment:

- New workflow behavior: always fires on PR to launch/production; conditionally runs Stryker

Database migrations:

- not applicable

Manual steps:

- After PR merges: orchestrator/admin runs `gh api -X PUT repos/heymoosh/voter-choice/branches/launch%2Fproduction/protection --input <updated-json>` to re-add `mutation` to required-status
- The updated JSON is documented in this packet's Notes section

Verification:

- `npm run lint`, `npm run test`, `npm run build` — all green (no source changes, but verify nothing breaks)
- YAML syntax check on the modified workflow (`python3 -c "import yaml; yaml.safe_load(open('.github/workflows/mutation.yml'))"`)
- Open this PR (which touches `.github/workflows/mutation.yml` — a scoped path per the workflow itself!) → mutation workflow should fire AND run Stryker (since the workflow file is in its own scoped paths list)
- After merge: a docs-only PR (or this packet's own merge state) demonstrates "passed (skipped)" status
- After merge: re-add `mutation` to required-status; a subsequent docs PR should merge cleanly with `mutation` reporting green

Test quality:

- Real CI behavior is observable; no separate unit tests needed

Critical logic trigger:

- business rule (gate enforcement); operational/reliability

## Scope

Touch:

- `.github/workflows/mutation.yml` — restructure trigger + add paths-filter step
- `.ai/work-packets/tdd-phase-2b-mutation-gate-deadlock-fix.md` — this packet

Do not touch:

- Any source code under `src/`
- `stryker.config.json`, `tsconfig.stryker.json`, or any other config
- Other workflows (`test.yml`, `deploy.yml`, ingest workflows)
- The `tdd-phase-2-mutation-testing.md` packet (this is a follow-up, not a revision)
- Branch protection (that's a post-merge manual step, NOT part of this PR's diff)
- `main` branch

## Ownership Audit

Concern: mutation workflow trigger semantics; branch-protection required-status compatibility
Existing owner: `.github/workflows/mutation.yml` (this packet modifies it)
Neighboring owners:

- Stryker config: `stryker.config.json` (unchanged)
- Branch protection: GitHub repo settings (post-merge update)
- TDD guardrail: `docs/ai-coding-practices/guardrails/test-driven-development.md` (mentions mutation gate; no changes needed)

Files/modules/docs inspected:

- `.github/workflows/mutation.yml` (current state)
- `.github/workflows/test.yml` (for pattern reference — no paths filter; always fires)
- Stryker docs (no Stryker-side changes needed)
- GitHub's documentation on required status checks behavior (specifically: skipped jobs count as passing)
- `dorny/paths-filter` README (for the filter step pattern)

Reuse/edit targets:

- Extend `.github/workflows/mutation.yml` in place (don't fork)
- Use `dorny/paths-filter@v3` (widely-adopted action)

New owner needed:

- no

Overlap/bloat risks:

- Path lists drift between `.github/workflows/mutation.yml` and `stryker.config.json`. Mitigation: this packet's Notes section explicitly calls out the sync requirement; the workflow has a comment pointing to `stryker.config.json` as the source of truth.

Recommendation:

- Single-PR fix. Small workflow change + this packet + post-merge `gh api` call.

Execution constraints:

- No admin bypass on the PR
- No changes outside the two files listed in Scope > Touch
- Verify YAML parses cleanly before pushing
- Surface unexpected GitHub Actions behaviors (e.g., if `dorny/paths-filter` interacts unexpectedly with `merge_group` events) as findings

## Acceptance Criteria

- `.github/workflows/mutation.yml` no longer has `paths:` under `on.pull_request:`. The workflow always fires on `pull_request` to `launch/production`.
- The `mutation` job uses `dorny/paths-filter@v3` (or equivalent) to detect if scoped paths changed.
- When scoped paths did NOT change AND event is `pull_request`: subsequent steps skip; job exits 0; CI reports `mutation: passed (skipped)`.
- When scoped paths DID change (or event is `schedule` / `workflow_dispatch`): Stryker runs as before.
- The scoped-paths list in the new paths-filter step matches the previous `on.pull_request.paths` list exactly (no silent drift).
- This PR itself demonstrates the fix: it touches `.github/workflows/mutation.yml` (which IS a scoped path per the workflow), so `mutation` should run Stryker on this PR — proving the "ran" path works.
- After merge: a follow-up docs-only PR demonstrates the "skipped" path works (mutation status = passed without running Stryker).
- `gh api` command to re-add `mutation` to required-status is documented in Notes and executed by orchestrator after merge.
- `npm run lint`, `npm run test`, `npm run build` — all green (no source changes).

## Test Plan

| AC | Test artifact | Test shape |
|---|---|---|
| Workflow always fires on PR | this PR's CI runs | mutation job appears in CI even though only workflow file changed |
| Stryker runs when scoped paths changed | this PR's CI run | mutation job runs full Stryker (since `.github/workflows/mutation.yml` is in scoped list); reports green or red based on score vs threshold |
| Stryker skips when no scoped paths changed | follow-up docs PR post-merge | mutation job runs paths-filter step, sees no scoped changes, exits 0 with skip notice |
| Branch protection accepts mutation as required | `gh api` PUT after merge | `gh api ... protection` returns contexts including `mutation` with the new app_id |
| YAML parses cleanly | local Python yaml.safe_load | no parse errors |
| No changes to non-scoped files | `git diff --stat` | only `mutation.yml` + this packet appear |

### Red-phase ritual for this packet

This packet doesn't introduce new code that needs Willison ritual; it's a CI configuration fix. The "verification" is observational — does the new workflow behave correctly when CI runs?

The closest analog to a red phase: BEFORE applying the workflow fix, document the deadlock with a screenshot or `gh pr view` of PR #1 showing `mutation: Expected — Waiting for status to be reported`. After the fix lands, that state should be unreachable for docs-only PRs.

## Evidence Plan

Visual evidence:

- This PR's GitHub Actions tab showing the mutation job running (the workflow file is in scoped paths, so Stryker fires)
- Post-merge: a follow-up docs PR's Actions tab showing the mutation job completing with "skipped" notice
- Post-merge: `gh api repos/heymoosh/voter-choice/branches/launch%2Fproduction/protection` output showing `mutation` in contexts with non-null app_id

Behavior evidence:

- This PR's CI logs showing the `paths-filter` step output (`scoped: 'true'`)
- A follow-up docs PR's CI logs showing the `paths-filter` step output (`scoped: 'false'`) + the skip notice + exit 0

Business logic evidence:

- Rule: "mutation reports status on every PR" — observed via this PR's run + a follow-up docs PR's run
- Rule: "Stryker only runs when scoped paths changed" — observed via the conditional behavior

Persistence evidence:

- The workflow file change persists on `launch/production` after merge
- Branch protection update via `gh api` persists (verifiable via `gh api ... protection`)

Auth/security evidence:

- not applicable

Commercial readiness evidence:

- operational/reliability lane: gate restored

Operational evidence:

- All `npm run *` commands clean
- YAML parses
- CI runs are visible artifacts

Integration evidence:

- The whole pipeline (PR → CI → mutation reports status → branch protection accepts → merge button enables) runs end-to-end after this lands

Regression evidence:

- The cron + workflow_dispatch triggers continue to work (no changes to those event types)

Proof standard:

- A reviewer can: (a) inspect the workflow diff; (b) see this PR's mutation job actually ran Stryker; (c) post-merge, see a docs PR's mutation job skipped Stryker; (d) confirm `gh api` re-added `mutation` to required-status without deadlocking subsequent docs PRs

Non-proof:

- "Workflow looks right" without observing both paths (scoped-changed AND not-changed)
- "Branch protection re-added" without a confirming docs-PR merge

## Anti-Solutions

- Do NOT remove `mutation` from required-status forever (the gate is the whole point)
- Do NOT use `continue-on-error: true` on the mutation job (defeats the gate)
- Do NOT pin `dorny/paths-filter` to `@main` (supply-chain risk — use a tag like `@v3`)
- Do NOT duplicate the scoped-paths list more than necessary; the new in-job filter is the canonical list (the workflow's prior `on.pull_request.paths:` block goes away)
- Do NOT change `stryker.config.json` in this PR — that's separate concern; keep this packet focused
- Do NOT admin-bypass this PR

## Notes

### Updated workflow shape (the diff)

The workflow's `on:` block changes from:

```yaml
on:
  pull_request:
    branches: [launch/production]
    paths:
      - "src/lib/server/budget.ts"
      - ...
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch:
```

to:

```yaml
on:
  pull_request:
    branches: [launch/production]
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch:
```

(Path list removed from trigger; workflow now always fires.)

The `mutation` job gets a new paths-filter step + conditional gating on subsequent steps:

```yaml
jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Detect scoped path changes (PR only)
        id: filter
        if: github.event_name == 'pull_request'
        uses: dorny/paths-filter@v3
        with:
          filters: |
            scoped:
              - 'src/lib/server/budget.ts'
              - 'src/lib/server/rate-limit.ts'
              - 'src/lib/generatePrompt.ts'
              - 'src/lib/getStateData.ts'
              - 'src/lib/server/alignment.ts'
              - 'src/lib/prompts/**'
              - 'src/lib/state-rules/**'
              - 'src/lib/anthropic-client-byok.ts'
              - 'src/lib/server/budget.test.ts'
              - 'src/lib/server/rate-limit.test.ts'
              - 'src/lib/generatePrompt.test.ts'
              - 'src/lib/getStateData.test.ts'
              - 'src/lib/server/alignment.test.ts'
              - 'stryker.config.json'
              - 'tsconfig.stryker.json'
              - '.github/workflows/mutation.yml'

      - name: Note skip when no scoped changes
        if: github.event_name == 'pull_request' && steps.filter.outputs.scoped == 'false'
        run: echo "::notice::No scoped paths changed; Stryker skipped. Mutation gate reports passed."

      # Below: all conditional on (pull_request AND scoped) OR (schedule OR workflow_dispatch)
      - name: Setup Node
        if: github.event_name != 'pull_request' || steps.filter.outputs.scoped == 'true'
        uses: actions/setup-node@v6
        with:
          node-version: "22"
          cache: "npm"

      - name: Install dependencies
        if: github.event_name != 'pull_request' || steps.filter.outputs.scoped == 'true'
        run: npm ci

      - name: Sync generated ballot prompt module
        if: github.event_name != 'pull_request' || steps.filter.outputs.scoped == 'true'
        run: npm run sync:ballot-prompt

      - name: Run Stryker mutation testing
        if: github.event_name != 'pull_request' || steps.filter.outputs.scoped == 'true'
        run: npx stryker run

      - name: Upload mutation report
        if: always() && (github.event_name != 'pull_request' || steps.filter.outputs.scoped == 'true')
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
          retention-days: 30
          if-no-files-found: warn
```

### Post-merge branch protection update

```bash
cat > /tmp/bp-mutation-restored.json <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "e2e", "mutation"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
gh api -X PUT repos/heymoosh/voter-choice/branches/launch%2Fproduction/protection --input /tmp/bp-mutation-restored.json
rm /tmp/bp-mutation-restored.json
```

### Closes out the rollout

After this packet lands, the TDD rollout's harness is fully complete:

- test (lint + vitest + build): required, gating, validated
- e2e (Playwright): required, gating, validated (Phase 1a + 3 follow-ups)
- mutation (Stryker): required, gating, validated (Phase 2 + 2a + 2b)
- Willison red/green ritual: validated locally
- Verification rigor rule: in guardrail
- Branch protection: configured

The project brief should be updated at packet ship time to mark the rollout's three-phase harness as SHIPPED + VALIDATED end-to-end. Phase 3 (visual regression + coverage thresholds + pre-push hook) is the only remaining TDD-rollout work, but it's blocked-on redesign (visual baselines need the new UI to exist) and is genuinely incremental.

After Phase 2b ships: redesign Phase 1 (prompt refactor) can start with full empirical confidence that the harness works as advertised.
