#!/usr/bin/env bash
# Smoke-test that the in-container Claude binary can:
#   1. start without error (binary present, auth valid)
#   2. complete a trivial prompt end-to-end
#   3. respond with sensible output
#
# Run this BEFORE dispatching any workflow to the container.
# A failure here means a fast diagnosis (auth/binary/network) rather
# than a 30-minute wait watching a Phase 1 build hang.
#
# Usage:
#   bash scripts/validate-container-claude.sh [worktree-path]
#
# Exit codes:
#   0 — in-container Claude responded successfully
#   1 — Claude exited with error or produced no output
#   2 — precondition failed (docker unavailable, worktree not a git repo)

set -euo pipefail

WORKTREE_PATH="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
RUN_ID="validate-container-claude-$(date -u +%Y%m%dT%H%M%SZ)"

if ! docker info >/dev/null 2>&1; then
  echo "validate-container-claude: docker is not running" >&2
  exit 2
fi

if [[ ! -d "$WORKTREE_PATH/.git" && ! -f "$WORKTREE_PATH/.git" ]]; then
  echo "validate-container-claude: not a git repo: $WORKTREE_PATH" >&2
  exit 2
fi

TRIVIAL_PROMPT='List the filenames in the src/ directory. Respond with just the filenames, one per line.'

echo "validate-container-claude: running trivial prompt in container..."
echo "  worktree: $WORKTREE_PATH"
echo "  run-id:   $RUN_ID"
echo ""

# Run the trivial prompt through the full container stack (same flags as the real workflow)
raw_output="$(bash "$WORKTREE_PATH/docker/run-claude.sh" --run-id "$RUN_ID" "$TRIVIAL_PROMPT" 2>&1)"
exit_code=$?
clean_output="$(printf '%s\n' "$raw_output" | tr -d '\r')"

echo "$clean_output"
echo ""

if [[ $exit_code -ne 0 ]]; then
  echo "validate-container-claude: FAIL — claude exited $exit_code" >&2
  exit 1
fi

# Expect at least one line that looks like a filename
if ! printf '%s\n' "$clean_output" | grep -qE '\.(tsx?|jsx?|json|css|mjs)$'; then
  echo "validate-container-claude: FAIL — no recognisable filename in output" >&2
  echo "  raw output follows above; check auth, model access, or network." >&2
  exit 1
fi

echo "validate-container-claude: OK — in-container Claude responded with file listing"
