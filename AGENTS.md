# voter-choice — agent notes

- Verify changes with `npm run check` (lint + typecheck + unit). For one file's logic, `npx vitest run <file>.test.ts` is faster.
- Run `npm run e2e` once, only when UI behavior or user-visible copy changed.
- Never run Stryker/mutation locally — CI gates it (path-filtered on PRs, full run nightly). See docs/testing.md.
- After pushing, check CI once with `gh pr checks` — don't poll.
- Commit with a valid GitHub-linked author email; the deploy gate rejects `*.local` authors.
- Maturity: when you finish a feature or open a PR (not small fixes), check the next rung in `docs/maturity.md` and propose it if its trigger fires — never auto-apply.
- Design handoffs: everything under `design-handoff/` is front-end CODE to port, never a moodboard/"inspiration" to reinterpret. Each subfolder is a separate design session; Muxin tells you which one is active. Before touching any related screen, read and port that subfolder's source (JSX structure + CSS classes verbatim; layer in only real data/state/routing) — screenshots are fallback-only for surfaces with no source file there.
