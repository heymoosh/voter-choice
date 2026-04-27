#!/usr/bin/env bash
# ai-evidence-check — structural check for final/evaluator evidence notes.
# Usage: scripts/ai-evidence-check.sh <evidence.md>

set +e

file="$1"
failed=0

error() { failed=1; printf '[ai-evidence-check] error: %s\n' "$*"; }
warn() { printf '[ai-evidence-check] warn: %s\n' "$*"; }

if [ -z "$file" ]; then
  echo "Usage: $0 <evidence.md>" >&2
  exit 2
fi

if [ ! -f "$file" ]; then
  error "evidence file not found: $file"
  exit 1
fi

for field in \
  "Evidence checked" \
  "Intent alignment" \
  "Missing or weak proof" \
  "Unverified risks"
do
  grep -qi "$field" "$file" || error "missing evidence field: $field"
done

if grep -qi 'tested manually' "$file" && ! grep -qiE 'observed|screenshot|command|url|artifact|log|output' "$file"; then
  error '"tested manually" appears without named observed behavior or artifact'
fi

if grep -qiE 'web|browser|ui|frontend|screenshot|responsive' "$file" && ! grep -qiE 'screenshot|playwright|browser|viewport|url|AQE|agentic qe' "$file"; then
  warn "user-facing/browser work lacks obvious screenshot/browser/AQE evidence"
fi

if [ "$failed" -ne 0 ]; then
  echo "[ai-evidence-check] failed"
  exit 1
fi

echo "[ai-evidence-check] complete"
exit 0
