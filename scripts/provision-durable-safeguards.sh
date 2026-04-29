#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT"

TF_BIN="${TF_BIN:-}"
if [ -z "$TF_BIN" ]; then
  if command -v terraform >/dev/null 2>&1; then
    TF_BIN="terraform"
  elif command -v tofu >/dev/null 2>&1; then
    TF_BIN="tofu"
  else
    echo "Missing Terraform/OpenTofu."
    echo "Install Terraform or OpenTofu, then rerun this script."
    exit 1
  fi
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Missing GitHub CLI: gh"
  exit 1
fi

repo="${GITHUB_REPOSITORY:-}"
if [ -z "$repo" ]; then
  origin="$(git config --get remote.origin.url || true)"
  repo="$(printf "%s" "$origin" | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##')"
fi
if [ -z "$repo" ]; then
  echo "Could not determine GitHub repository. Set GITHUB_REPOSITORY=owner/name and rerun."
  exit 1
fi

read_secret() {
  local prompt="$1"
  local var_name="$2"
  local current="${!var_name:-}"
  if [ -n "$current" ]; then
    return
  fi
  printf "%s: " "$prompt" >&2
  stty -echo
  IFS= read -r value
  stty echo
  printf "\n" >&2
  export "$var_name=$value"
}

read_plain() {
  local prompt="$1"
  local var_name="$2"
  local default_value="$3"
  local current="${!var_name:-}"
  if [ -n "$current" ]; then
    return
  fi
  printf "%s [%s]: " "$prompt" "$default_value" >&2
  IFS= read -r value
  export "$var_name=${value:-$default_value}"
}

read_plain "Upstash account email" "UPSTASH_EMAIL" ""
if [ -z "${UPSTASH_EMAIL:-}" ]; then
  echo "UPSTASH_EMAIL is required."
  exit 1
fi
read_secret "Upstash API key" "UPSTASH_API_KEY"
if [ -z "${UPSTASH_API_KEY:-}" ]; then
  echo "UPSTASH_API_KEY is required."
  exit 1
fi

export TF_VAR_upstash_email="$UPSTASH_EMAIL"
export TF_VAR_upstash_api_key="$UPSTASH_API_KEY"
export TF_VAR_region="${UPSTASH_REGION:-us-west-1}"
export TF_VAR_database_name="${UPSTASH_DATABASE_NAME:-voter-choice-launch-safeguards}"

(
  cd "$ROOT/infra/upstash"
  "$TF_BIN" init
  "$TF_BIN" apply -auto-approve
)

rest_url="$("$TF_BIN" -chdir="$ROOT/infra/upstash" output -raw rest_url)"
rest_token="$("$TF_BIN" -chdir="$ROOT/infra/upstash" output -raw rest_token)"

if [ -z "$rest_url" ] || [ -z "$rest_token" ]; then
  echo "Terraform completed, but REST URL/token output was empty."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated with a usable token."
  echo "Paste a GitHub token with permission to set Actions secrets for $repo."
  read_secret "GitHub token" "GH_TOKEN"
fi

printf "%s" "$rest_url" | gh secret set UPSTASH_REDIS_REST_URL --repo "$repo"
printf "%s" "$rest_token" | gh secret set UPSTASH_REDIS_REST_TOKEN --repo "$repo"

if [ -n "${VERCEL_TOKEN:-}" ]; then
  if command -v vercel >/dev/null 2>&1; then
    printf "%s" "$rest_url" | vercel env add UPSTASH_REDIS_REST_URL production --force --token="$VERCEL_TOKEN" >/dev/null
    printf "%s" "$rest_token" | vercel env add UPSTASH_REDIS_REST_TOKEN production --force --token="$VERCEL_TOKEN" >/dev/null
    echo "Stored Upstash REST credentials in GitHub Actions and Vercel production env."
  else
    echo "Stored Upstash REST credentials in GitHub Actions. Vercel CLI not found; deploy workflow will sync them to Vercel."
  fi
else
  echo "Stored Upstash REST credentials in GitHub Actions."
  echo "No VERCEL_TOKEN was provided; the launch/production deploy workflow will sync them to Vercel."
fi
