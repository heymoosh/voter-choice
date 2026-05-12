#!/usr/bin/env bash
# ai-bootstrap — one-command setup for the AI Coding Practices kit.
# Safe to run repeatedly.

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

info() { printf '[ai-bootstrap] %s\n' "$*"; }
warn() { printf '[ai-bootstrap] warn: %s\n' "$*"; }

if git rev-parse --git-dir >/dev/null 2>&1; then
  git config core.hooksPath .githooks
  rc=$?
  if [ $rc -eq 0 ]; then
    info "configured git hooks path: .githooks"
  else
    warn "could not configure git hooks path automatically; run: git config core.hooksPath .githooks"
  fi
else
  warn "not inside a git repo; run git init before relying on hooks"
fi

for script in scripts/ai-preflight.sh scripts/ai-mece-check.sh scripts/ai-session-lock.sh scripts/ai-worktree-intent.sh scripts/ai-verify.sh scripts/ai-packet-readiness-check.sh scripts/ai-evidence-check.sh scripts/ai-qe-check.sh; do
  [ -f "$script" ] && chmod +x "$script" 2>/dev/null
done

# ---------------------------------------------------------------------------
# Secrets bootstrap — pull missing vars from Bitwarden SM into .env.local
# so that subagents and non-interactive shells have credentials without
# needing to source ~/.bash_profile.
#
# BWS_ACCESS_TOKEN must already be in the environment (set in ~/.bash_profile).
# Safe to run repeatedly — only fills gaps, never overwrites existing values.
# UUID → name map mirrors .github/workflows/*.yml.
# ---------------------------------------------------------------------------
ENV_LOCAL="$ROOT/.env.local"

bws_fill() {
  local var_name="$1"
  local uuid="$2"
  # Skip if already set in .env.local
  if grep -qE "^${var_name}=.+" "$ENV_LOCAL" 2>/dev/null; then
    return 0
  fi
  # Require BWS_ACCESS_TOKEN
  if [ -z "$BWS_ACCESS_TOKEN" ]; then
    warn "BWS_ACCESS_TOKEN not set — cannot pull $var_name from Bitwarden SM"
    return 1
  fi
  if ! command -v bws >/dev/null 2>&1; then
    warn "bws CLI not found — cannot pull $var_name"
    return 1
  fi
  local value
  value=$(bws secret get "$uuid" --access-token "$BWS_ACCESS_TOKEN" --output json 2>/dev/null | jq -r '.value // empty')
  if [ -z "$value" ]; then
    warn "could not pull $var_name from BWS (uuid=$uuid) — add it manually to .env.local"
    return 1
  fi
  touch "$ENV_LOCAL"
  printf '%s=%s\n' "$var_name" "$value" >> "$ENV_LOCAL"
  info "pulled $var_name from Bitwarden SM → .env.local"
}

bws_fill DATABASE_URL                    "90abeeed-130e-4707-86ff-b446003770c2"
bws_fill ANTHROPIC_VOTER_API             "c569bc18-1095-4532-b5df-b42a00f87c2e"
bws_fill GOOGLE_CIVIC_API_KEY            "8737e327-3962-45af-b290-b42a013e1066"
bws_fill NEXT_PUBLIC_GOOGLE_PLACES_API_KEY "5fb2ebf9-500f-4335-86d5-b42b016051d0"
bws_fill OPENSTATES_API_KEY              "85bad136-3cbc-4062-9ccc-b4460037de19"
bws_fill FEC_API_KEY                     "17e983ad-82bd-45fe-8499-b446003890ac"
bws_fill CONGRESS_GOV_API_KEY            "306d6600-cd70-492a-9b46-b44600383766"

# ---------------------------------------------------------------------------

if [ -x scripts/ai-preflight.sh ]; then
  scripts/ai-preflight.sh
else
  warn "scripts/ai-preflight.sh missing or not executable"
fi

info "bootstrap complete"
