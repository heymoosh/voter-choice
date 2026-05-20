#!/usr/bin/env bash
# ai-mutation-check — wrap Stryker mutation testing with the project's
# scoped config and surface the score relative to the break threshold.
#
# Usage: scripts/ai-mutation-check.sh
#
# Behavior:
#   - Runs `npx stryker run` against the repo's `stryker.config.json`.
#   - Stryker itself exits 0 when the overall mutation score meets or
#     exceeds `thresholds.break`, and 1 otherwise. This wrapper forwards
#     Stryker's exit code transparently — exit 0 on pass, non-zero on fail.
#   - Before invoking Stryker, runs `npm run sync:ballot-prompt` because
#     Stryker spawns Vitest programmatically and bypasses npm pre/post
#     hooks; without this, generated modules under src/lib/generated/
#     can be stale or missing and every mutation re-run will fail to
#     import them — producing a meaningless 0% score.
#   - After the run, parses the Stryker stdout for the "All files" row
#     of the clear-text table and prints a one-line summary of mutants
#     (killed / survived / score / threshold). If parsing fails, the
#     full Stryker output is still printed so nothing is lost.
#
# Environment:
#   STRYKER_CONFIG  Optional path to a Stryker config file. The self-tests
#                   at scripts/ai-mutation-check.test.sh use this to point
#                   the wrapper at a sandbox config without touching the
#                   production one. Production callers should leave it
#                   unset; the wrapper falls back to stryker.config.json.
#
# Spec: .ai/work-packets/tdd-phase-2-mutation-testing.md — Stryker setup.

set -u

# --- locate the repo so this works no matter where it's invoked from ----
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || {
  echo "[ai-mutation-check] ERROR: cannot cd into repo root '$ROOT'"
  exit 1
}

CONFIG="${STRYKER_CONFIG:-stryker.config.json}"

# --- prerequisite: sync generated modules (Stryker bypasses npm hooks) --
if [ -f scripts/generate-ballot-prompt-module.mjs ]; then
  echo "[ai-mutation-check] syncing generated ballot prompt module (pre-Stryker)"
  if ! node scripts/generate-ballot-prompt-module.mjs >/tmp/ai-mutation-check-sync.log 2>&1; then
    echo "[ai-mutation-check] ERROR: ballot prompt sync failed:"
    cat /tmp/ai-mutation-check-sync.log
    exit 1
  fi
fi

# --- run Stryker, capturing output for both display and summary parsing --
echo "[ai-mutation-check] running Stryker against $CONFIG"
output_log="$(mktemp -t ai-mutation-check.XXXXXX)"
trap 'rm -f "$output_log"' EXIT

if [ "$CONFIG" = "stryker.config.json" ]; then
  npx stryker run 2>&1 | tee "$output_log"
else
  npx stryker run --configFile "$CONFIG" 2>&1 | tee "$output_log"
fi
# Pull Stryker's actual exit code through the tee pipe. PIPESTATUS[0] is
# the leftmost command — i.e., the npx invocation, not tee.
stryker_rc=${PIPESTATUS[0]}

# --- parse the "All files" row from the clear-text reporter --------------
# Stryker 9.x clear-text table looks like:
#   File         | total | covered | # killed | # timeout | # survived | # no cov | # errors |
#   All files    | 26.90 |   44.79 |      219 |         0 |        270 |      325 |      298 |
# Field indexes (awk -F'|' is 1-indexed; field 1 is the leading empty
# string before the first pipe; field 2 is "All files"; data starts at 3):
#   3=total%, 4=covered%, 5=killed, 6=timeout, 7=survived, 8=no-cov, 9=errors
# In an older clear-text format (no "covered" column) field 4 would have
# been killed. The header line is parsed first to detect which shape we're
# looking at so the wrapper works across Stryker minor versions.
all_row="$(grep -E "^All files" "$output_log" 2>/dev/null | head -1)"
header_row="$(grep -E "^File" "$output_log" 2>/dev/null | head -1)"
threshold_break="$(grep -oE '"break"[[:space:]]*:[[:space:]]*[0-9.]+' "$CONFIG" 2>/dev/null | grep -oE '[0-9.]+$' | head -1)"

echo
echo "[ai-mutation-check] --- summary ---"
if [ -n "$all_row" ]; then
  if echo "$header_row" | grep -qE "covered"; then
    # Stryker 9.x layout with total+covered columns
    score=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
    covered=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$3); print $3}')
    killed=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$4); print $4}')
    timeout=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$5); print $5}')
    survived=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$6); print $6}')
    echo "[ai-mutation-check] score=${score}%  covered=${covered}%  killed=${killed}  survived=${survived}  timeout=${timeout}  threshold(break)=${threshold_break:-unknown}"
  else
    # Older "% score" single-column layout
    score=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
    killed=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$3); print $3}')
    timeout=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$4); print $4}')
    survived=$(echo "$all_row" | awk -F'|' '{gsub(/ /,"",$5); print $5}')
    echo "[ai-mutation-check] score=${score}%  killed=${killed}  survived=${survived}  timeout=${timeout}  threshold(break)=${threshold_break:-unknown}"
  fi
else
  echo "[ai-mutation-check] could not parse Stryker summary table (full output above)"
fi

if [ "$stryker_rc" -eq 0 ]; then
  echo "[ai-mutation-check] PASS — mutation score meets break threshold"
else
  echo "[ai-mutation-check] FAIL — mutation score below break threshold (Stryker exit $stryker_rc)"
fi

exit "$stryker_rc"
