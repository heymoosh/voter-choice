# voter-choice — agent notes

- Verify changes with `npm run check` (lint + typecheck + unit). For one file's logic, `npx vitest run <file>.test.ts` is faster.
- Run `npm run e2e` once, only when UI behavior or user-visible copy changed.
- Never run Stryker/mutation locally — CI gates it (path-filtered on PRs, full run nightly). See docs/testing.md.
- After pushing, check CI once with `gh pr checks` — don't poll.
- Commit with a valid GitHub-linked author email; the deploy gate rejects `*.local` authors.

## Machine facts (this Mac) — any agent, any vendor

Hard-won on 2026-07-17; these are properties of Muxin's machine, not of any one AI tool.

- **System `grep` is ugrep 7.5.0**, not BSD grep. Its `-q -v` combination exits 1 even when
  lines ARE selected (three CI-grade false failures before a fixture autopsy caught it). Never
  combine `-q` with `-v` in scripts here — use count-then-test:
  `n=$(... | grep -icv PAT || true); [ "${n:-0}" -gt 0 ]`.
- **No coreutils `timeout` binary exists.** Scripts needing a wall-clock cap must ship a shim
  (see `~/.claude/verify/run-canary.sh` for a perl `alarm` fallback with the same exit-124 contract).
- **`git pull` output lies when piped through `tail`/`head` on a checkout with local mods:**
  the "Updating a..b" line prints BEFORE a would-be-overwritten abort, so a filtered pull looks
  successful while deploying nothing (eight merges silently undeployed once). Verify with
  `git status -sb` (look for "behind") or check a merged file exists on disk.
- **macOS TCC can silently revoke ~/Documents access mid-run** (EPERM everywhere under it while
  `~` still works). It is not a sandbox/config issue and no agent can fix it: a human re-Allows
  in System Settings → Privacy & Security → Files & Folders (never Full Disk Access) and restarts
  the process. Stop and surface; don't retry-loop.
- **Board writes:** only through `prose_kanban` (coordinator / `locked_rewrite`) — never edit
  `docs/operations/voter-choice-backlog.md` as text. The board's merge machinery treats direct
  edits as a guardrail violation.

## Live-verification harness lives elsewhere

The live-verification harness (hermetic fixture test + bounded live canary, gated behind
`CANARY_I_MEAN_IT`) is canonical in the `claude-config` repo at `~/.claude/verify/`
(`run-fixture-test.sh`, `run-canary.sh`) — this repo deliberately has no `verify/` tree of its own.
Machinery PRs opened here that cite harness evidence should reference it by that path; don't expect
or add a local copy.
