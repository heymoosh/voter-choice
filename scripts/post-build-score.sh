#!/usr/bin/env bash

set -euo pipefail

repo=""
run_dir=""
branch=""
phase=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --run-dir)
      run_dir="${2:-}"
      shift 2
      ;;
    --branch)
      branch="${2:-}"
      shift 2
      ;;
    --phase)
      phase="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

[[ -n "$repo" ]] || { echo "--repo is required" >&2; exit 2; }
[[ -n "$run_dir" ]] || { echo "--run-dir is required" >&2; exit 2; }

repo="$(cd "$repo" && pwd)"

timing_file="$run_dir/timing.jsonl"
workflow_file="$run_dir/workflow-log.jsonl"

if [[ -z "$branch" && -f "$timing_file" ]]; then
  branch="$(jq -r 'select(.event=="build_start") | .branch // empty' "$timing_file" | head -n 1)"
fi
if [[ -z "$phase" && -f "$timing_file" ]]; then
  phase="$(jq -r 'select(.event=="build_start") | .phase // empty' "$timing_file" | head -n 1)"
fi

[[ -n "$branch" ]] || { echo "Could not determine branch from $timing_file" >&2; exit 1; }
[[ -n "$phase" ]] || { echo "Could not determine phase from $timing_file" >&2; exit 1; }

git -C "$repo" checkout "$branch" >/dev/null 2>&1

branch_metrics_dir="$repo/metrics/$branch"
mkdir -p "$branch_metrics_dir"

if [[ -f "$timing_file" ]]; then
  cp "$timing_file" "$branch_metrics_dir/timing.jsonl"
fi
if [[ -f "$workflow_file" ]]; then
  cp "$workflow_file" "$branch_metrics_dir/workflow-log.jsonl"
fi

node "$repo/scoring/measure.mjs" \
  --repo "$repo" \
  --phase "$phase" \
  --branch "$branch" \
  --timing-log "$timing_file" \
  --workflow-log "$workflow_file"

if [[ "$phase" -ge 2 ]]; then
  node "$repo/scoring/diff-hygiene.mjs" --repo "$repo" --branch "$branch" --phase "$phase" >/dev/null
  node "$repo/scoring/compute-deltas.mjs" --repo "$repo" --branch "$branch" --phase "$phase" >/dev/null
fi
