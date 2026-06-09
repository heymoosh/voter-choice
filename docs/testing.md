# Testing

Use the normal project checks for most work:

```bash
npm run lint
npm run test
npm run build
npm run e2e
```

Run `npm run e2e` when browser behavior changes.

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

The universal `/code-reviewer` command uses this repo-local adapter when changed
files touch high-stakes or Stryker-scoped paths.

Stryker is scoped to high-stakes logic through `stryker.config.json` and
`tsconfig.stryker.json`. Local wrapper:

```bash
bash scripts/ai-mutation-check.sh
```

Self-test:

```bash
bash scripts/ai-mutation-check.test.sh
```

The CI mutation gate lives in `.github/workflows/mutation.yml`.
