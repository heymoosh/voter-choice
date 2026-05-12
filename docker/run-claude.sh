#!/bin/bash
# Run Claude Code in an isolated Docker container
# - Mounts only the voter-choice repo
# - Runs as non-root user "runner"
# - Mounts Claude credentials read-only
# - Masks scoring scripts so workflows cannot read the rubric
#
# Scoring isolation (see docs/LEARNINGS.md → Learning 009):
# The `scoring/` directory on main contains the measurement and
# adherence-analysis code. If the workflow can read those files during
# a build, it learns exactly what metrics and thresholds it will be
# scored on, which enables gaming. The path is masked with an empty
# tmpfs overlay so the container sees it as an empty directory
# regardless of what actually exists on the host branch.
#
# Legacy note: Runs 1-3 (branches workflow/*, run2/*, run3/*) have
# scoring scripts baked into their `scripts/` directory because they
# were created before the scoring isolation fix. Those branches are
# permanently contaminated. Re-runs of those workflows must be done on
# new branches (run4/*, run5/*, etc.) created from a post-fix main
# commit where `scripts/` is empty on the scaffold.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_CONFIG_FILE="$HOME/.claude.json"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CURRENT_BRANCH="$(git -C "$REPO_DIR" branch --show-current 2>/dev/null | tr '/ ' '--')"
RUN_ID="${CURRENT_BRANCH:-run}-${TIMESTAMP}"
RUN_OUTPUT_DIR="$REPO_DIR/metrics/run-outputs/$RUN_ID"
DOC_FILE_MOUNTS=(
  -v "$REPO_DIR/docs/PROJECT_SPEC.md:/workspace/docs/PROJECT_SPEC.md:ro"
  -v "$REPO_DIR/docs/PHASE2_SPEC.md:/workspace/docs/PHASE2_SPEC.md:ro"
  -v "$REPO_DIR/docs/PHASE3_SPEC.md:/workspace/docs/PHASE3_SPEC.md:ro"
  -v "$REPO_DIR/docs/PHASE4_SPEC.md:/workspace/docs/PHASE4_SPEC.md:ro"
  -v "$REPO_DIR/docs/PHASE5_SPEC.md:/workspace/docs/PHASE5_SPEC.md:ro"
  -v "$REPO_DIR/docs/PHASE6_SPEC.md:/workspace/docs/PHASE6_SPEC.md:ro"
  -v "$REPO_DIR/docs/BALLOT_PROMPT.md:/workspace/docs/BALLOT_PROMPT.md:ro"
)
CLAUDE_FILE_MOUNTS=()

if [[ -f "$CLAUDE_CONFIG_FILE" ]]; then
  CLAUDE_FILE_MOUNTS+=(-v "$CLAUDE_CONFIG_FILE:/home/runner/.claude.json:ro")
fi

DRY_RUN=0
NO_ISOLATION=0
SHELL_CMD=""
PROMPT="--"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-isolation)
      NO_ISOLATION=1
      shift
      ;;
    --shell)
      SHELL_CMD="${2:-}"
      shift 2
      ;;
    --run-id)
      RUN_ID="${2:-}"
      RUN_OUTPUT_DIR="$REPO_DIR/metrics/run-outputs/$RUN_ID"
      shift 2
      ;;
    *)
      PROMPT="$1"
      shift
      ;;
  esac
done

mkdir -p "$RUN_OUTPUT_DIR"

if [[ "$DRY_RUN" -eq 1 ]]; then
  DRY_ROOT="$(mktemp -d)"
  WORKSPACE_ROOT="$DRY_ROOT/workspace"
  mkdir -p "$WORKSPACE_ROOT"

  if [[ "$NO_ISOLATION" -eq 1 ]]; then
    ln -s "$REPO_DIR/scoring" "$WORKSPACE_ROOT/scoring"
    ln -s "$REPO_DIR/metrics" "$WORKSPACE_ROOT/metrics"
    ln -s "$REPO_DIR/docs" "$WORKSPACE_ROOT/docs"
  else
    mkdir -p "$WORKSPACE_ROOT/scoring" "$WORKSPACE_ROOT/metrics" "$WORKSPACE_ROOT/docs"
    cp "$REPO_DIR/docs/PROJECT_SPEC.md" "$WORKSPACE_ROOT/docs/PROJECT_SPEC.md"
    cp "$REPO_DIR/docs/PHASE2_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE2_SPEC.md"
    cp "$REPO_DIR/docs/PHASE3_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE3_SPEC.md"
    cp "$REPO_DIR/docs/PHASE4_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE4_SPEC.md"
    cp "$REPO_DIR/docs/PHASE5_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE5_SPEC.md"
    cp "$REPO_DIR/docs/PHASE6_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE6_SPEC.md"
    cp "$REPO_DIR/docs/BALLOT_PROMPT.md" "$WORKSPACE_ROOT/docs/BALLOT_PROMPT.md"
  fi

  HOST_ASSERTIONS='[ -z "$(ls -A __WORKSPACE__/scoring 2>/dev/null)" ] || { echo "isolation breach: scoring/ visible" >&2; exit 1; }; [ -z "$(ls -A __WORKSPACE__/metrics 2>/dev/null)" ] || { echo "isolation breach: metrics/ visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/RUN_LOG.md ] || { echo "isolation breach: RUN_LOG.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/LEARNINGS.md ] || { echo "isolation breach: LEARNINGS.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/EXPERIMENT_HISTORY.md ] || { echo "isolation breach: EXPERIMENT_HISTORY.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/EXPERIMENT_V2_PLAN.md ] || { echo "isolation breach: EXPERIMENT_V2_PLAN.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/FINAL_RANKING.md ] || { echo "isolation breach: FINAL_RANKING.md visible" >&2; exit 1; }'
  HOST_ASSERTIONS="${HOST_ASSERTIONS//__WORKSPACE__/$WORKSPACE_ROOT}"
  HOST_CMD="${SHELL_CMD//\/workspace/$WORKSPACE_ROOT}"
  bash -lc "$HOST_ASSERTIONS; ${HOST_CMD:-true}; echo 'isolation ok'"
  rm -rf "$DRY_ROOT"
  exit 0
fi

# Build the image if needed
echo "Building claude-runner image..."
docker build -t claude-runner "$REPO_DIR/docker"

echo "Starting Claude Code in isolated container..."
echo "  Repo mounted at: /workspace"
echo "  Running as:      runner (non-root)"
echo "  Scoring masked:  /workspace/scoring (tmpfs)"
echo "  Scratch metrics: $RUN_OUTPUT_DIR -> /workspace/metrics"
echo ""

ASSERTIONS='[ -z "$(ls -A /workspace/scoring 2>/dev/null)" ] || { echo "isolation breach: scoring/ visible" >&2; exit 1; }; [ -z "$(ls -A /workspace/metrics 2>/dev/null)" ] || { echo "isolation breach: metrics/ visible" >&2; exit 1; }; [ ! -e /workspace/docs/RUN_LOG.md ] || { echo "isolation breach: RUN_LOG.md visible" >&2; exit 1; }; [ ! -e /workspace/docs/LEARNINGS.md ] || { echo "isolation breach: LEARNINGS.md visible" >&2; exit 1; }; [ ! -e /workspace/docs/EXPERIMENT_HISTORY.md ] || { echo "isolation breach: EXPERIMENT_HISTORY.md visible" >&2; exit 1; }; [ ! -e /workspace/docs/EXPERIMENT_V2_PLAN.md ] || { echo "isolation breach: EXPERIMENT_V2_PLAN.md visible" >&2; exit 1; }; [ ! -e /workspace/docs/FINAL_RANKING.md ] || { echo "isolation breach: FINAL_RANKING.md visible" >&2; exit 1; }'

if [[ -n "$SHELL_CMD" ]]; then
  CONTAINER_CMD="$SHELL_CMD"
else
  CONTAINER_CMD='claude --dangerously-skip-permissions -p "$CLAUDE_PROMPT"'
fi

TMPFS_FLAGS=(
  --tmpfs /workspace/scoring:rw,size=1m
  --tmpfs /workspace/docs:rw,size=8m
)

if [[ "$NO_ISOLATION" -eq 1 ]]; then
  TMPFS_FLAGS=()
  DOC_FILE_MOUNTS=()
fi

docker run -it --rm \
  --name claude-runner \
  -v "$REPO_DIR:/workspace" \
  -v "$RUN_OUTPUT_DIR:/workspace/metrics" \
  -v "$CLAUDE_DIR:/home/runner/.claude" \
  "${CLAUDE_FILE_MOUNTS[@]}" \
  "${TMPFS_FLAGS[@]}" \
  "${DOC_FILE_MOUNTS[@]}" \
  --network host \
  --ipc=host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -e CLAUDE_PROMPT="$PROMPT" \
  claude-runner \
  bash -lc "$ASSERTIONS; $CONTAINER_CMD"

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ -f "$RUN_OUTPUT_DIR/timing.jsonl" ]]; then
    bash "$REPO_DIR/scripts/post-build-score.sh" --repo "$REPO_DIR" --run-dir "$RUN_OUTPUT_DIR"
  fi
fi
