#!/usr/bin/env bash

set -euo pipefail

WORKTREE_PATH="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
RUN_ID="validate-container-git-$(date -u +%Y%m%dT%H%M%SZ)"

if [[ ! -d "$WORKTREE_PATH/.git" && ! -f "$WORKTREE_PATH/.git" ]]; then
  echo "Worktree path does not look like a git checkout: $WORKTREE_PATH" >&2
  exit 2
fi

SHELL_CMD='
set -euo pipefail
status_line="$(git status --short --branch | sed -n "1p")"
printf "__STATUS__ %s\n" "$status_line"
printf "__LOG_START__\n"
git log --oneline -5
printf "__LOG_END__\n"
file_count="$(git ls-files | wc -l | tr -d " ")"
printf "__FILES__ %s\n" "$file_count"
head_sha="$(git rev-parse HEAD)"
printf "__HEAD__ %s\n" "$head_sha"
'

output="$(bash "$WORKTREE_PATH/docker/run-claude.sh" --run-id "$RUN_ID" --shell "$SHELL_CMD" 2>&1)"
printf '%s\n' "$output"

status_line="$(printf '%s\n' "$output" | sed -n 's/^__STATUS__ //p' | tail -n 1)"
file_count="$(printf '%s\n' "$output" | sed -n 's/^__FILES__ //p' | tail -n 1)"
head_sha="$(printf '%s\n' "$output" | sed -n 's/^__HEAD__ //p' | tail -n 1)"

if [[ -z "$status_line" ]]; then
  echo "validate-container-git: missing git status output" >&2
  exit 1
fi

if [[ "$status_line" == *"No commits yet"* ]]; then
  echo "validate-container-git: container reported an uninitialized repo" >&2
  exit 1
fi

if [[ "$status_line" != "## "* ]]; then
  echo "validate-container-git: unexpected status line: $status_line" >&2
  exit 1
fi

if [[ -z "$file_count" || ! "$file_count" =~ ^[0-9]+$ || "$file_count" -le 0 ]]; then
  echo "validate-container-git: git ls-files returned invalid count: ${file_count:-<empty>}" >&2
  exit 1
fi

if [[ -z "$head_sha" || ! "$head_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "validate-container-git: git rev-parse HEAD returned invalid SHA: ${head_sha:-<empty>}" >&2
  exit 1
fi

echo "validate-container-git: OK"
