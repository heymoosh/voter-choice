#!/usr/bin/env bash
# ai-session-lock — lightweight lockfile guard for multiple AI sessions in one checkout.
# Usage:
#   scripts/ai-session-lock.sh ensure [session-id]
#   scripts/ai-session-lock.sh remove [session-id]
#   scripts/ai-session-lock.sh check
#   scripts/ai-session-lock.sh block-if-sibling

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
LOCK_DIR="$ROOT/.ai/sessions"
STALE_SECS=$((45 * 60))
mkdir -p "$LOCK_DIR" 2>/dev/null

cmd="${1:-check}"
sid="${2:-${AI_SESSION_ID:-${PPID:-manual}}}"
cwd="$(pwd -P 2>/dev/null)"
now() { date +%s; }
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null; }

reap_stale() {
  cutoff=$(( $(now) - STALE_SECS ))
  for f in "$LOCK_DIR"/*.lock; do
    [ -e "$f" ] || continue
    m="$(mtime "$f")"
    [ -n "$m" ] && [ "$m" -le "$cutoff" ] && rm -f "$f"
  done
}

siblings() {
  reap_stale
  for f in "$LOCK_DIR"/*.lock; do
    [ -e "$f" ] || continue
    base="$(basename "$f" .lock)"
    [ "$base" = "$sid" ] && continue
    lock_cwd="$(sed -n 's/^cwd=//p' "$f" 2>/dev/null | head -1)"
    [ "$lock_cwd" = "$cwd" ] && echo "$base"
  done
}

case "$cmd" in
  ensure)
    reap_stale
    {
      echo "session=$sid"
      echo "cwd=$cwd"
      echo "started_at=$(now)"
    } > "$LOCK_DIR/$sid.lock"
    ;;
  remove)
    rm -f "$LOCK_DIR/$sid.lock"
    ;;
  check)
    list="$(siblings)"
    [ -z "$list" ] && exit 0
    echo "[ai-session-lock] warn: other AI session(s) active in this checkout:" >&2
    echo "$list" | sed 's/^/  /' >&2
    ;;
  block-if-sibling)
    list="$(siblings)"
    [ -z "$list" ] && exit 0
    echo "[ai-session-lock] BLOCKED: other AI session(s) active in this checkout:" >&2
    echo "$list" | sed 's/^/  /' >&2
    echo "Use a separate worktree or close the other session before editing." >&2
    exit 2
    ;;
  *)
    echo "Usage: $0 {ensure|remove|check|block-if-sibling} [session-id]" >&2
    exit 2
    ;;
esac
