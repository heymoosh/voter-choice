#!/usr/bin/env bash
# ai-packet-readiness-check — structural readiness check for a work packet.
# Usage: scripts/ai-packet-readiness-check.sh <work-packet.md>

set +e

packet="$1"
failed=0

warn() { printf '[ai-packet-readiness-check] warn: %s\n' "$*"; }
error() { failed=1; printf '[ai-packet-readiness-check] error: %s\n' "$*"; }

if [ -z "$packet" ]; then
  echo "Usage: $0 <work-packet.md>" >&2
  exit 2
fi

if [ ! -f "$packet" ]; then
  error "packet not found: $packet"
  exit 1
fi

for section in \
  "## Original User Intent" \
  "## Intent Interpretation" \
  "## Business Logic" \
  "## Commercial Readiness" \
  "## Operational Reproducibility" \
  "## Ownership Audit" \
  "## Acceptance Criteria" \
  "## Evidence Plan" \
  "## Anti-Solutions"
do
  grep -q "^$section" "$packet" || error "missing section: $section"
done

if grep -n -E '<[^>]+>|TBD|TODO|FIXME|not defined yet' "$packet" >/tmp/ai-packet-readiness-placeholders.$$ 2>/dev/null; then
  warn "possible placeholders remain:"
  sed 's/^/[ai-packet-readiness-check]   /' /tmp/ai-packet-readiness-placeholders.$$
  rm -f /tmp/ai-packet-readiness-placeholders.$$
fi

for phrase in \
  "Original User Intent" \
  "Proof standard:" \
  "Non-proof:" \
  "Manual steps:" \
  "Test quality:" \
  "Existing owner:" \
  "Execution constraints:"
do
  grep -q "$phrase" "$packet" || error "missing required field: $phrase"
done

if [ "$failed" -ne 0 ]; then
  echo "[ai-packet-readiness-check] failed"
  exit 1
fi

echo "[ai-packet-readiness-check] complete"
exit 0
