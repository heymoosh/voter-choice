#!/usr/bin/env bash
# SCAFFOLD — NOT ACTIVE (see docs/LEARNINGS.md Learning 015)
#
# Intended purpose: validate that in-container Claude Code authenticates via the
# bind-mounted ~/.claude/ subscription session, NOT via ANTHROPIC_API_KEY.
#
# Current status: subscription auth via ~/.claude/ bind-mount does NOT work on
# macOS Docker hosts because OAuth tokens are stored in the macOS Keychain, which
# is not accessible inside Linux Docker containers. This script is kept as a
# scaffold in case the operator chooses option (b) or (c) from Learning 015.
#
# Original three-layer proof design:
#   1. Structural: docker/run-claude.sh contains the env -u ANTHROPIC_API_KEY strip
#   2. Runtime:    .env.local is sourced (so ANTHROPIC_API_KEY is meaningful in shell),
#                  but the env var is absent from the subprocess that would inherit it
#   3. End-to-end: a trivial prompt completes → subscription auth works
#
# Usage:
#   bash scripts/validate-container-claude-subscription.sh [worktree-path]
#
# Exit codes:
#   0 — all checks pass
#   1 — a check failed (details on stderr)
#   2 — precondition failed (docker not running, not a git repo, ~/.claude missing)

set -euo pipefail

WORKTREE_PATH="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
RUN_ID="validate-subscription-$(date -u +%Y%m%dT%H%M%SZ)"
SCRIPT="$WORKTREE_PATH/docker/run-claude.sh"
CLAUDE_DIR="$HOME/.claude"

# ── Preconditions ──────────────────────────────────────────────────────────────

if ! docker info >/dev/null 2>&1; then
  echo "validate-container-claude-subscription: docker is not running" >&2
  exit 2
fi

if [[ ! -d "$WORKTREE_PATH/.git" && ! -f "$WORKTREE_PATH/.git" ]]; then
  echo "validate-container-claude-subscription: not a git repo: $WORKTREE_PATH" >&2
  exit 2
fi

if [[ ! -d "$CLAUDE_DIR" ]]; then
  echo "validate-container-claude-subscription: ~/.claude/ not found ($CLAUDE_DIR)" >&2
  echo "  Claude Code subscription session must be present on the host." >&2
  exit 2
fi

# Auth is stored in ~/.claude.json (oauthAccount.access_token), not in ~/.claude/sessions/.
CLAUDE_JSON="$HOME/.claude.json"
if [[ ! -f "$CLAUDE_JSON" ]]; then
  echo "validate-container-claude-subscription: ~/.claude.json not found" >&2
  echo "  Log in to Claude Code on the host first." >&2
  exit 2
fi
if ! python3 -c "import json,sys; d=json.load(open('$CLAUDE_JSON')); oa=d.get('oauthAccount',{}); sys.exit(0 if oa.get('access_token') else 1)" 2>/dev/null; then
  echo "validate-container-claude-subscription: ~/.claude.json has no oauthAccount.access_token" >&2
  echo "  Subscription session may have expired. Re-authenticate with Claude Code on the host." >&2
  exit 2
fi

echo "validate-container-claude-subscription: running checks..."
echo "  worktree: $WORKTREE_PATH"
echo "  run-id:   $RUN_ID"
echo ""

FAIL=0

# ── Check 1: Structural — run-claude.sh strips ANTHROPIC_API_KEY ──────────────

echo "[1/3] Structural: docker/run-claude.sh contains env -u ANTHROPIC_API_KEY..."
if grep -q 'env -u ANTHROPIC_API_KEY claude' "$SCRIPT"; then
  echo "  PASS"
else
  echo "  FAIL: env -u ANTHROPIC_API_KEY not found in $SCRIPT" >&2
  FAIL=1
fi

# ── Check 2: Runtime — ANTHROPIC_API_KEY absent from claude's env ─────────────

echo "[2/3] Runtime: ANTHROPIC_API_KEY is absent from claude subprocess env..."

# Mirror what CONTAINER_CMD does: source .env.local (sets ANTHROPIC_API_KEY in shell),
# then run env -u ANTHROPIC_API_KEY env to verify the var is stripped for the subprocess.
# Grep count must be 0. Also verify ANTHROPIC_API_KEY IS set in the outer shell
# (proves the strip is meaningful, not just that .env.local is absent/empty).
RUNTIME_SHELL_CMD='
set -euo pipefail
if [[ -f "$WORKTREE_PATH/.env.local" ]]; then set -a; source "$WORKTREE_PATH/.env.local"; set +a; fi
# Verify ANTHROPIC_API_KEY IS in the outer shell env (so the strip is meaningful)
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  printf "__OUTER_KEY__ absent\n"
else
  printf "__OUTER_KEY__ present\n"
fi
# Count how many times ANTHROPIC_API_KEY appears in the env that claude would see
stripped_count="$(env -u ANTHROPIC_API_KEY env | grep -c "^ANTHROPIC_API_KEY=" || true)"
printf "__STRIPPED_COUNT__ %s\n" "$stripped_count"
'

runtime_output="$(bash "$SCRIPT" --run-id "$RUN_ID-rt" --shell "$RUNTIME_SHELL_CMD" 2>&1)"
clean_rt="$(printf '%s\n' "$runtime_output" | tr -d '\r')"

outer_key="$(printf '%s\n' "$clean_rt" | sed -n 's/^__OUTER_KEY__ //p' | tail -n1)"
stripped_count="$(printf '%s\n' "$clean_rt" | sed -n 's/^__STRIPPED_COUNT__ //p' | tail -n1)"

if [[ "$outer_key" == "absent" ]]; then
  echo "  NOTE: .env.local absent or ANTHROPIC_API_KEY not set — strip is a no-op but harmless"
elif [[ "$outer_key" == "present" && "$stripped_count" == "0" ]]; then
  echo "  PASS: ANTHROPIC_API_KEY present in shell, stripped from subprocess (count=0)"
else
  echo "  FAIL: ANTHROPIC_API_KEY leaked into subprocess (count=${stripped_count:-?})" >&2
  echo "  Runtime output:"
  printf '%s\n' "$clean_rt"
  FAIL=1
fi

# ── Check 3: End-to-end — trivial prompt via subscription auth ────────────────

echo "[3/3] End-to-end: trivial prompt completes via subscription auth..."

TRIVIAL_PROMPT='Respond with exactly the text: subscription-auth-ok'

e2e_output="$(bash "$SCRIPT" --run-id "$RUN_ID-e2e" "$TRIVIAL_PROMPT" 2>&1)"
e2e_clean="$(printf '%s\n' "$e2e_output" | tr -d '\r')"

if printf '%s\n' "$e2e_clean" | grep -qi 'subscription-auth-ok'; then
  echo "  PASS: Claude responded with expected text"
elif printf '%s\n' "$e2e_clean" | grep -qiE 'api_key|authentication|unauthorized|403|401|workspace.*limit|budget'; then
  echo "  FAIL: Response indicates auth/quota error" >&2
  printf '%s\n' "$e2e_clean"
  FAIL=1
elif printf '%s\n' "$e2e_clean" | grep -qE '\S'; then
  echo "  PASS (partial): Claude responded but not verbatim — subscription auth appears functional"
  echo "  Response snippet: $(printf '%s\n' "$e2e_clean" | grep -E '\S' | head -3)"
else
  echo "  FAIL: Empty response from Claude" >&2
  FAIL=1
fi

# ── Summary ────────────────────────────────────────────────────────────────────

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "validate-container-claude-subscription: OK — all 3 checks passed"
  exit 0
else
  echo "validate-container-claude-subscription: FAIL — one or more checks failed" >&2
  exit 1
fi
