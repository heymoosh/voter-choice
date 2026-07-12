# Testing

Verification is tiered — match the check to the change:

| Tier          | When                                          | Command         |
| ------------- | --------------------------------------------- | --------------- |
| Inner loop    | every change                                  | `npm run check` |
| Behavior gate | UI behavior or visible copy changed, run once | `npm run e2e`   |
| Heavy         | CI only — never in-session                    | see below       |

`npm run check` runs lint + `tsc --noEmit` + unit tests. For one file's
logic, `npx vitest run <file>.test.ts` is faster still.

Heavy checks live in CI:

- **Mutation (Stryker)** — required PR check, path-filtered to high-stakes
  logic paths; full-scope run nightly (`.github/workflows/mutation.yml`).
- **E2E** — required PR check, path-filtered to e2e-relevant paths
  (`.github/workflows/test.yml`).
- **Legacy ballot e2e** — nightly anti-rot run for the parked experience
  (`.github/workflows/e2e-legacy-nightly.yml`).

## Duplication Ratchet

`npm run dup:check` (a step inside the `test` job in
`.github/workflows/test.yml`) runs jscpd over `src/**` and fails the PR when
a change introduces NEW copy-paste duplication: a file pair sharing clones
that isn't in the committed baseline
(`scripts/quality/duplication-baseline.json`), or a baselined pair that
grew. Pre-existing duplication is grandfathered — the gate answers "did
this change copy code?", not "is the codebase clone-free?".

- Fix path: extract the shared component/util instead of copying.
- Intentional duplication (rare — e.g. a deliberate mid-migration fork):
  `npm run dup:baseline`, commit the baseline diff, justify it in the PR.
- When you REMOVE duplication, the gate passes and prints a nudge to run
  `npm run dup:baseline` so the ratchet tightens — do it in the same PR.

## Issue-Consistency Invariant

The user's locked issues are one data set that must read coherently on
every surface that renders "your issues". Two layers gate it:

- `src/prototype/redesign/voteGroups.test.ts` — unit: the voting-history
  panel's groups (`voteGroupsForUserIssues`) and the seat cards' rows
  (`seatIssueAlignmentRows`) derive the same set/order/labels from the same
  inputs.
- `e2e/redesign-issue-consistency.spec.ts` — rendered: full-list surfaces
  (intake review, IntakeLocked, ballot rail) show every locked issue;
  seat-scoped surfaces (overview card, deep card, all-votes panel) agree
  with each other exactly, with jurisdiction level scoping as the only —
  and consistent — difference. Voteless/unmapped issues render honest
  empty states; they never silently vanish from one surface while showing
  on another.

If a new surface renders the user's issues, derive it from the same
selectors (`issuesForLevel` → `seatIssueAlignmentRows` /
`voteGroupsForUserIssues`) and add it to that spec.

## Red-Phase Helper

The universal `/tdd` command uses this repo-local adapter when it is present.

`scripts/ai-tdd-red.sh <test-file>` verifies the red phase for a new Vitest test:

- exits `0` when at least one test fails, confirming the test targets missing behavior
- exits `1` when all tests pass before implementation, or when Vitest collects no tests

Self-test:

```bash
bash scripts/ai-tdd-red.test.sh
```

## Mutation Testing

CI is the normal gate (`.github/workflows/mutation.yml`): path-filtered on
PRs, full scope nightly. Do not run Stryker in a working session.

For the rare explicit local need, the universal `/code-reviewer` command
uses this repo-local adapter when changed files touch Stryker-scoped paths.
Stryker is scoped to high-stakes logic through `stryker.config.json` and
`tsconfig.stryker.json`. Local wrapper:

```bash
bash scripts/ai-mutation-check.sh
```

Self-test:

```bash
bash scripts/ai-mutation-check.test.sh
```
