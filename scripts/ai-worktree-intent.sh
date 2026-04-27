#!/usr/bin/env bash
# ai-worktree-intent — require .ai/wt-intent.md on task branches.
# Usage:
#   scripts/ai-worktree-intent.sh check
#   scripts/ai-worktree-intent.sh create <slug> <tracker-ref> <one sentence intent>

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0
INTENT=".ai/wt-intent.md"
cmd="${1:-check}"
branch="$(git branch --show-current 2>/dev/null)"

requires_intent=0
case "$branch" in
  main|master|"") requires_intent=0 ;;
  *) requires_intent=1 ;;
esac

case "$cmd" in
  check)
    [ "$requires_intent" -eq 0 ] && exit 0
    [ -f "$INTENT" ] && exit 0
    echo "[ai-worktree-intent] warn: branch '$branch' has no $INTENT." >&2
    echo "Create one before substantive edits so parallel sessions know this worktree's purpose." >&2
    exit 0
    ;;
  create)
    slug="${2:?slug required}"
    ref="${3:?tracker/work-packet ref required}"
    shift 3
    body="$*"
    mkdir -p .ai
    {
      echo "slug: $slug"
      echo "declared_at: $(date -Iseconds 2>/dev/null || date)"
      echo "branch: $branch"
      echo "ref: $ref"
      echo
      echo "${body:-Worktree intent declared.}"
    } > "$INTENT"
    echo "created $INTENT"
    ;;
  *)
    echo "Usage: $0 {check|create <slug> <ref> <intent>}" >&2
    exit 2
    ;;
esac
