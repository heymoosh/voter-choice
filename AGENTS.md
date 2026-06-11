# voter-choice — agent notes

- Verify changes with `npm run check` (lint + typecheck + unit). For one file's logic, `npx vitest run <file>.test.ts` is faster.
- Run `npm run e2e` once, only when UI behavior or user-visible copy changed.
- Never run Stryker/mutation locally — CI gates it (path-filtered on PRs, full run nightly). See docs/testing.md.
- After pushing, check CI once with `gh pr checks` — don't poll.
- Commit with a valid GitHub-linked author email; the deploy gate rejects `*.local` authors.
