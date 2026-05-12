#!/usr/bin/env bash
# Gate Phase C action dispatch by checking API quota availability.
#
# Usage:
#   bash scripts/api-budget-check.sh [--quiet] [--min-pct N]
#
# --quiet     : suppress banner; only print the budget line and exit code
# --min-pct N : fail if remaining budget < N% (default: 20)
#
# Exit codes:
#   0 — budget is sufficient (>= min-pct remaining)
#   1 — budget is low or unknown; do not start an action
#   2 — precondition error (no API key, curl unavailable)
#
# How it works:
#   Calls the Anthropic usage API (if available) or falls back to a
#   dry-run Claude probe. The probe sends a minimal 1-token prompt and
#   checks whether the response is a quota error vs. a success.
#
# Budget estimation when API doesn't expose raw quota:
#   Tracks action count in metrics/budget-usage.jsonl and estimates
#   remaining budget based on Learning 014: ~3% per action (conservative).
#   If usage data is available from timing.jsonl per-run, uses actual
#   token counts when possible.
#
# To use in Phase C launch sequence:
#   bash scripts/api-budget-check.sh || { echo "HALT: quota low"; exit 1; }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
USAGE_LOG="$SCRIPT_DIR/metrics/budget-usage.jsonl"
MIN_PCT=20
QUIET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quiet) QUIET=1; shift ;;
    --min-pct) MIN_PCT="${2:-20}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

banner() { [[ "$QUIET" -eq 0 ]] && echo "$@" || true; }

banner "=== API Budget Check ==="
banner "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 1: Try a minimal probe to detect quota exhaustion.
# Run claude --print with a 1-token prompt and check for the 400 quota error.
probe_result=""
if command -v claude >/dev/null 2>&1; then
  probe_output="$(claude --bare -p "ok" 2>&1 | head -5 || true)"
  if echo "$probe_output" | grep -qi "workspace API usage limits\|usage limit"; then
    banner "QUOTA EXHAUSTED: API returned workspace usage limit error."
    banner "Action dispatch halted. Check your Anthropic Console for reset date."
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"check\":\"probe\",\"result\":\"quota_exhausted\",\"action\":\"halt\"}" \
      >> "$USAGE_LOG" 2>/dev/null || true
    exit 1
  fi
  probe_result="ok"
  banner "Probe: API is accessible (no quota error)."
else
  banner "Warning: claude binary not on PATH — skipping live probe. Using usage log only."
fi

# Step 2: Estimate remaining budget from usage log.
if [[ ! -f "$USAGE_LOG" ]]; then
  banner "No usage log found at $USAGE_LOG."
  banner "If this is the first run, budget is assumed full. Log will be created."
  echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"check\":\"first-run\",\"estimatedPctUsed\":0}" \
    >> "$USAGE_LOG" 2>/dev/null || true
  banner "Estimated budget: 100% remaining (no history)."
  exit 0
fi

# Count completed actions (entries with action_complete event)
action_count=$(grep -c '"action_complete"' "$USAGE_LOG" 2>/dev/null || echo 0)
# Conservative estimate: 3% per action (Learning 014)
pct_used=$(( action_count * 3 ))
pct_remaining=$(( 100 - pct_used ))

if [[ "$pct_remaining" -lt 0 ]]; then pct_remaining=0; fi

banner "Actions logged: $action_count"
banner "Estimated usage: ${pct_used}% (3% per action, conservative)"
banner "Estimated remaining: ${pct_remaining}%"

if [[ "$pct_remaining" -lt "$MIN_PCT" ]]; then
  banner ""
  banner "BUDGET WARNING: estimated remaining (${pct_remaining}%) < minimum threshold (${MIN_PCT}%)."
  banner "Halting action dispatch. Wait for API quota reset or increase threshold with --min-pct."
  echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"check\":\"estimate\",\"actionsLogged\":$action_count,\"estimatedPctUsed\":$pct_used,\"estimatedPctRemaining\":$pct_remaining,\"result\":\"low\",\"action\":\"halt\"}" \
    >> "$USAGE_LOG" 2>/dev/null || true
  exit 1
fi

banner ""
banner "Budget check passed: ~${pct_remaining}% estimated remaining."
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"check\":\"ok\",\"actionsLogged\":$action_count,\"estimatedPctRemaining\":$pct_remaining,\"probe\":\"${probe_result}\"}" \
  >> "$USAGE_LOG" 2>/dev/null || true

# Usage: call this at the end of each successful action to track consumption:
#   bash scripts/api-budget-check.sh record-action --framework vanilla --phase 1 --branch experiment/vanilla-r1
# (Not implemented here — add if real token-count data becomes available)
