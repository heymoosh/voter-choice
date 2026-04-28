#!/usr/bin/env bash
# ai-mece-check — structural MECE/ownership checks for the AI Coding Practices kit.
# Usage: scripts/ai-mece-check.sh [--warn|--strict]

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

mode="${1:---warn}"
case "$mode" in
  --warn) strict=0 ;;
  --strict) strict=1 ;;
  *)
    echo "Usage: $0 [--warn|--strict]" >&2
    exit 2
    ;;
esac

failed=0
warned=0
MAP="docs/ai-coding-practices/source-of-truth-map.md"

note() { printf '[ai-mece-check] %s\n' "$*"; }

warn() {
  warned=1
  printf '[ai-mece-check] warn: %s\n' "$*"
}

error() {
  failed=1
  printf '[ai-mece-check] error: %s\n' "$*"
}

strict_or_warn() {
  if [ "$strict" -eq 1 ]; then
    error "$*"
  else
    warn "$*"
  fi
}

has_glob_chars() {
  case "$1" in
    *'*'*|*'?'*) return 0 ;;
    *) return 1 ;;
  esac
}

owner_matches_file() {
  spec="$1"
  file="$2"

  case "$spec" in
    */)
      case "$file" in "$spec"*) return 0 ;; esac
      ;;
    *'*'*|*'?'*)
      case "$file" in $spec) return 0 ;; esac
      ;;
    *)
      [ "$file" = "$spec" ] && return 0
      ;;
  esac

  return 1
}

is_covered() {
  file="$1"
  while IFS= read -r spec; do
    [ -n "$spec" ] || continue
    owner_matches_file "$spec" "$file" && return 0
  done <<EOF
$OWNER_SPECS
EOF
  return 1
}

extract_owner_specs() {
  awk -F'|' '
    NR > 2 && $0 ~ /^\|/ {
      owner=$3
      while (match(owner, /`[^`]+`/)) {
        spec=substr(owner, RSTART + 1, RLENGTH - 2)
        print spec
        owner=substr(owner, RSTART + RLENGTH)
      }
    }
  ' "$MAP" | sort -u
}

if [ ! -f "$MAP" ]; then
  strict_or_warn "$MAP missing; MECE ownership cannot be checked."
  [ "$strict" -eq 1 ] && exit 1
  exit 0
fi

OWNER_SPECS="$(extract_owner_specs)"

while IFS= read -r spec; do
  [ -n "$spec" ] || continue
  if has_glob_chars "$spec"; then
    set -- $spec
    [ -e "$1" ] || strict_or_warn "mapped owner pattern has no matches: $spec"
  elif [ "${spec%/}" != "$spec" ]; then
    [ -d "$spec" ] || strict_or_warn "mapped owner directory does not exist: $spec"
  else
    [ -e "$spec" ] || strict_or_warn "mapped owner does not exist: $spec"
  fi
done <<EOF
$OWNER_SPECS
EOF

awk -F'|' '
  NR > 2 && $0 ~ /^\|/ {
    concern=$2
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", concern)
    if (concern != "" && concern != "---") count[concern]++
  }
  END {
    for (concern in count) {
      if (count[concern] > 1) print concern
    }
  }
' "$MAP" | while IFS= read -r concern; do
  strict_or_warn "duplicate concern in source-of-truth map: $concern"
done

durable_files="$( {
  for f in AGENTS.md CLAUDE.md CODEX.md README.md AI_AGENT_START_HERE.md TRACKER.md; do
    [ -f "$f" ] && printf '%s\n' "$f"
  done
  [ -d docs/ai-coding-practices ] && find docs/ai-coding-practices -type f -name '*.md'
  [ -d .claude ] && find .claude -type f
  [ -d .codex ] && find .codex -type f
  [ -d scripts ] && find scripts -type f
  [ -d .githooks ] && find .githooks -type f
} | sort -u )"

while IFS= read -r file; do
  [ -n "$file" ] || continue
  is_covered "$file" || strict_or_warn "durable file is not covered by $MAP: $file"
done <<EOF
$durable_files
EOF

check_line_budget() {
  file="$1"
  limit="$2"
  [ -f "$file" ] || return 0
  lines="$(wc -l < "$file" | tr -d ' ')"
  [ "${lines:-0}" -le "$limit" ] || warn "$file has $lines lines; intended budget is $limit."
}

check_line_budget AGENTS.md 60
check_line_budget CLAUDE.md 50
check_line_budget CODEX.md 50
check_line_budget AI_AGENT_START_HERE.md 40

for script in scripts/ai-bootstrap.sh scripts/ai-preflight.sh scripts/ai-mece-check.sh scripts/ai-qe-check.sh scripts/ai-adoption-scan.sh; do
  if [ ! -x "$script" ]; then
    strict_or_warn "$script missing or not executable"
  fi
done

for field in \
  "Concern:" \
  "## Original User Intent" \
  "## Intent Interpretation" \
  "## Business Logic" \
  "## Commercial Readiness" \
  "## Operational Reproducibility" \
  "Applicability:" \
  "Lanes in scope:" \
  "User decisions needed:" \
  "Setup:" \
  "Configuration:" \
  "Provider setup:" \
  "Infrastructure/deployment:" \
  "Database migrations:" \
  "Manual steps:" \
  "Critical logic trigger:" \
  "Rules:" \
  "Assumptions:" \
  "User-confirmed decisions:" \
  "Edge cases:" \
  "Out of scope:" \
  "Existing owner:" \
  "Neighboring owners:" \
  "Files/modules/docs inspected:" \
  "Reuse/edit targets:" \
  "New owner needed:" \
  "Overlap/bloat risks:" \
  "Recommendation:" \
  "Execution constraints:" \
  "Visual evidence:" \
  "Behavior evidence:" \
  "Business logic evidence:" \
  "Persistence evidence:" \
  "Auth/security evidence:" \
  "Commercial readiness evidence:" \
  "Operational evidence:" \
  "Integration evidence:" \
  "Regression evidence:" \
  "Proof standard:" \
  "Non-proof:"
do
  if ! grep -q "$field" docs/ai-coding-practices/templates/work-packet.md 2>/dev/null; then
    strict_or_warn "work packet template missing required field: $field"
  fi
done

if [ ! -f docs/ai-coding-practices/commands/evaluate-work.md ]; then
  strict_or_warn "evaluate-work command procedure missing"
fi

if [ -d .claude/commands ] && [ ! -f .claude/commands/evaluate-work.md ]; then
  strict_or_warn "Claude evaluate-work command adapter missing"
fi

if [ ! -f docs/ai-coding-practices/commands/correct-work.md ]; then
  strict_or_warn "correct-work command procedure missing"
fi

if [ ! -f docs/ai-coding-practices/templates/correction-packet.md ]; then
  strict_or_warn "correction packet template missing"
fi

if [ -d .claude/commands ] && [ ! -f .claude/commands/correct-work.md ]; then
  strict_or_warn "Claude correct-work command adapter missing"
fi

if [ ! -f docs/ai-coding-practices/commands/packet-readiness-check.md ]; then
  strict_or_warn "packet-readiness-check command procedure missing"
fi

if [ ! -f docs/ai-coding-practices/commands/adopt-existing-repo.md ]; then
  strict_or_warn "adopt-existing-repo command procedure missing"
fi

if [ ! -f docs/ai-coding-practices/templates/adoption-plan.md ]; then
  strict_or_warn "adoption plan template missing"
fi

if [ -d .claude/commands ] && [ ! -f .claude/commands/packet-readiness-check.md ]; then
  strict_or_warn "Claude packet-readiness-check command adapter missing"
fi

if [ -d .claude/commands ] && [ ! -f .claude/commands/adopt-existing-repo.md ]; then
  strict_or_warn "Claude adopt-existing-repo command adapter missing"
fi

for script in scripts/ai-packet-readiness-check.sh scripts/ai-evidence-check.sh scripts/ai-qe-check.sh; do
  if [ ! -x "$script" ]; then
    strict_or_warn "$script missing or not executable"
  fi
done

for field in \
  "Source work packet:" \
  "Source evaluation:" \
  "Retry count:" \
  "## Findings To Fix" \
  "Required correction:" \
  "Evidence required:" \
  "Change mapping:" \
  "## Fix Mapping" \
  "## Escalation Trigger"
do
  if ! grep -q "$field" docs/ai-coding-practices/templates/correction-packet.md 2>/dev/null; then
    strict_or_warn "correction packet template missing required field: $field"
  fi
done

if ! grep -q '^## System Ownership Map' docs/ai-coding-practices/templates/project-brief.md 2>/dev/null; then
  strict_or_warn "project brief template missing System Ownership Map section"
fi

for field in "## Original User Intent" "## Intent Interpretation" "## Domain / Business Rules" "## Commercial Readiness" "## Operational Reproducibility"; do
  if ! grep -q "$field" docs/ai-coding-practices/templates/project-brief.md 2>/dev/null; then
    strict_or_warn "project brief template missing required field: $field"
  fi
done

if ! grep -q 'ownership-discipline.md' docs/ai-coding-practices/source-of-truth-map.md 2>/dev/null; then
  strict_or_warn "source-of-truth map does not list ownership-discipline.md"
fi

if [ ! -f docs/ai-coding-practices/guardrails/qe-tooling.md ]; then
  strict_or_warn "qe-tooling guardrail missing"
fi

if [ ! -f docs/ai-coding-practices/guardrails/commercial-app-readiness.md ]; then
  strict_or_warn "commercial-app-readiness guardrail missing"
fi

if [ ! -f docs/ai-coding-practices/guardrails/operational-reproducibility.md ]; then
  strict_or_warn "operational-reproducibility guardrail missing"
fi

if [ -f .ai/enable-aqe ]; then
  if [ ! -f .claude/mcp.json ]; then
    strict_or_warn "Claude Agentic QE MCP adapter missing"
  fi

  if ! grep -q 'agentic-qe' .claude/mcp.json 2>/dev/null; then
    strict_or_warn "Claude MCP config missing agentic-qe server"
  fi

  if ! grep -q 'mcp_servers.agentic-qe' .codex/config.toml 2>/dev/null; then
    strict_or_warn "Codex config missing agentic-qe MCP server"
  fi
fi

if ! grep -q 'packet drift' docs/ai-coding-practices/commands/evaluate-work.md 2>/dev/null; then
  strict_or_warn "evaluate-work missing packet drift output"
fi

if [ ! -f docs/ai-coding-practices/guardrails/orchestration-posture.md ]; then
  strict_or_warn "orchestration-posture guardrail missing"
fi

if ! grep -q 'orchestration-posture.md' AGENTS.md 2>/dev/null; then
  strict_or_warn "AGENTS.md does not reference orchestration-posture.md"
fi

if [ ! -f docs/ai-coding-practices/guardrails/drift-watch.md ]; then
  strict_or_warn "drift-watch guardrail missing"
fi

if ! grep -q 'drift-watch.md' AGENTS.md 2>/dev/null; then
  strict_or_warn "AGENTS.md does not reference drift-watch.md"
fi

if [ -e START_HERE.md ]; then
  strict_or_warn "START_HERE.md still exists; use AI_AGENT_START_HERE.md as the canonical bootstrap doc"
fi

if ! grep -q 'Workflow loaded: AGENTS.md + orchestration posture + preflight.' docs/ai-coding-practices/guardrails/request-routing.md 2>/dev/null; then
  strict_or_warn "request routing format missing visible workflow-loaded self-check"
fi

protected_write_pattern='(>|>>|tee |sed -i|perl -pi|python|node|ruby|awk .*>)'
for protected in 'TRACKER.md' '.ai/work-packets' '.ai/project-briefs'; do
  if grep -R -n -E "$protected_write_pattern" scripts .githooks 2>/dev/null | grep -F "$protected" >/dev/null 2>&1; then
    strict_or_warn "script/hook appears to write protected coordination state: $protected"
  fi
done

if grep -R -n -E '^[^#]*mkdir -p \.ai|^[^#]*> "\$LOCK_DIR/|^[^#]*rm -f "\$LOCK_DIR/' scripts/ai-session-lock.sh >/dev/null 2>&1; then
  :
fi

if [ "$failed" -ne 0 ]; then
  note "failed"
  exit 1
fi

if [ "$warned" -ne 0 ]; then
  note "complete with warnings"
else
  note "complete"
fi

exit 0
