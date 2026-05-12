#!/usr/bin/env bash

set -euo pipefail

event=""
phase=""
branch=""
step=""
status=""
file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --event)
      event="${2:-}"
      shift 2
      ;;
    --phase)
      phase="${2:-}"
      shift 2
      ;;
    --branch)
      branch="${2:-}"
      shift 2
      ;;
    --step)
      step="${2:-}"
      shift 2
      ;;
    --status)
      status="${2:-}"
      shift 2
      ;;
    --file)
      file="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$event" ]]; then
  echo "--event is required" >&2
  exit 2
fi

if [[ "$event" == "workflow_step" ]]; then
  [[ -n "$phase" ]] || { echo "--phase is required for workflow_step" >&2; exit 2; }
  [[ -n "$step" ]] || { echo "--step is required for workflow_step" >&2; exit 2; }
  [[ -n "$status" ]] || { echo "--status is required for workflow_step" >&2; exit 2; }
  file="${file:-metrics/workflow-log.jsonl}"
else
  [[ -n "$phase" ]] || { echo "--phase is required" >&2; exit 2; }
  file="${file:-metrics/timing.jsonl}"
fi

timestamp=""
if timestamp="$(date -Iseconds 2>/dev/null)"; then
  :
else
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

mkdir -p "$(dirname "$file")"

payload="{\"event\":\"$(json_escape "$event")\""
if [[ -n "$phase" ]]; then
  payload+=",\"phase\":${phase}"
fi
if [[ -n "$branch" ]]; then
  payload+=",\"branch\":\"$(json_escape "$branch")\""
fi
if [[ -n "$step" ]]; then
  payload+=",\"step\":\"$(json_escape "$step")\""
fi
if [[ -n "$status" ]]; then
  payload+=",\"status\":\"$(json_escape "$status")\""
fi
payload+=",\"timestamp\":\"${timestamp}\"}"

printf '%s\n' "$payload" >> "$file"
