#!/usr/bin/env bash
# SessionStart reminder — nudge to run the weekly bill-tagging when it's overdue.
#
# Why this exists: backend bill-tagging no longer runs on a GitHub cron, because
# that cron used the app's front-end Anthropic key (ANTHROPIC_VOTER_API) for an
# unattended backend job and drained the monthly budget. Tagging is now
# owner-initiated. This hook keeps the weekly cadence visible so it isn't
# silently forgotten.
#
# Best-effort by design: it only fires when you open Claude Code in THIS repo.
# It is a nudge, not a guarantee. Silent unless a run is overdue (>7 days).
set -uo pipefail

proj="${CLAUDE_PROJECT_DIR:-$(pwd)}"
marker="$proj/.claude/state/tagging-last-run"
now=$(date +%s)
week=$((7 * 24 * 3600))

last=0
if [ -f "$marker" ]; then
  last=$(tr -dc '0-9' < "$marker" 2>/dev/null || echo 0)
fi
[ -z "$last" ] && last=0

age=$(( now - last ))
if [ "$age" -ge "$week" ]; then
  if [ "$last" -eq 0 ]; then
    when="never recorded"
  else
    when="$(( age / 86400 )) days ago"
  fi
  echo "⏰ Weekly bill-tagging looks overdue (last recorded run: ${when})."
  echo "   Backend tagging is owner-initiated now (the Sunday cron was disabled to"
  echo "   keep the front-end API key off unattended jobs). To run it, then record it:"
  echo "     # run the tagging job (Claude Code job, or: gh workflow run ingest-tag-bills.yml)"
  echo "     mkdir -p \"$proj/.claude/state\" && date +%s > \"$proj/.claude/state/tagging-last-run\""
fi
exit 0
