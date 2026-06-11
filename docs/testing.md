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
