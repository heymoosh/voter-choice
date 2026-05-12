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
WORKTREE_PATH="$REPO_DIR"
COMMON_GIT_DIR_RAW="$(git -C "$WORKTREE_PATH" rev-parse --git-common-dir)"
if [[ "$COMMON_GIT_DIR_RAW" = /* ]]; then
  COMMON_GIT_DIR="$COMMON_GIT_DIR_RAW"
else
  COMMON_GIT_DIR="$(cd "$WORKTREE_PATH" && cd "$COMMON_GIT_DIR_RAW" && pwd)"
fi
HOST_MAIN_REPO="$(dirname "$COMMON_GIT_DIR")"
MAIN_GIT_DIR="$HOST_MAIN_REPO/.git"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_CONFIG_FILE="$HOME/.claude.json"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CURRENT_BRANCH="$(git -C "$WORKTREE_PATH" branch --show-current 2>/dev/null | tr '/ ' '--')"
RUN_ID="${CURRENT_BRANCH:-run}-${TIMESTAMP}"
RUN_OUTPUT_DIR="$WORKTREE_PATH/metrics/run-outputs/$RUN_ID"
DOC_FILE_MOUNTS=(
  -v "$WORKTREE_PATH/docs/PROJECT_SPEC.md:$WORKTREE_PATH/docs/PROJECT_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/PHASE2_SPEC.md:$WORKTREE_PATH/docs/PHASE2_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/PHASE3_SPEC.md:$WORKTREE_PATH/docs/PHASE3_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/PHASE4_SPEC.md:$WORKTREE_PATH/docs/PHASE4_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/PHASE5_SPEC.md:$WORKTREE_PATH/docs/PHASE5_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/PHASE6_SPEC.md:$WORKTREE_PATH/docs/PHASE6_SPEC.md:ro"
  -v "$WORKTREE_PATH/docs/BALLOT_PROMPT.md:$WORKTREE_PATH/docs/BALLOT_PROMPT.md:ro"
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
      RUN_OUTPUT_DIR="$WORKTREE_PATH/metrics/run-outputs/$RUN_ID"
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
    ln -s "$WORKTREE_PATH/scoring" "$WORKSPACE_ROOT/scoring"
    ln -s "$WORKTREE_PATH/metrics" "$WORKSPACE_ROOT/metrics"
    ln -s "$WORKTREE_PATH/docs" "$WORKSPACE_ROOT/docs"
  else
    mkdir -p "$WORKSPACE_ROOT/scoring" "$WORKSPACE_ROOT/metrics" "$WORKSPACE_ROOT/docs"
    cp "$WORKTREE_PATH/docs/PROJECT_SPEC.md" "$WORKSPACE_ROOT/docs/PROJECT_SPEC.md"
    cp "$WORKTREE_PATH/docs/PHASE2_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE2_SPEC.md"
    cp "$WORKTREE_PATH/docs/PHASE3_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE3_SPEC.md"
    cp "$WORKTREE_PATH/docs/PHASE4_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE4_SPEC.md"
    cp "$WORKTREE_PATH/docs/PHASE5_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE5_SPEC.md"
    cp "$WORKTREE_PATH/docs/PHASE6_SPEC.md" "$WORKSPACE_ROOT/docs/PHASE6_SPEC.md"
    cp "$WORKTREE_PATH/docs/BALLOT_PROMPT.md" "$WORKSPACE_ROOT/docs/BALLOT_PROMPT.md"
  fi

  HOST_ASSERTIONS='[ -z "$(ls -A __WORKSPACE__/scoring 2>/dev/null)" ] || { echo "isolation breach: scoring/ visible" >&2; exit 1; }; [ -z "$(ls -A __WORKSPACE__/metrics 2>/dev/null)" ] || { echo "isolation breach: metrics/ visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/RUN_LOG.md ] || { echo "isolation breach: RUN_LOG.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/LEARNINGS.md ] || { echo "isolation breach: LEARNINGS.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/EXPERIMENT_HISTORY.md ] || { echo "isolation breach: EXPERIMENT_HISTORY.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/EXPERIMENT_V2_PLAN.md ] || { echo "isolation breach: EXPERIMENT_V2_PLAN.md visible" >&2; exit 1; }; [ ! -e __WORKSPACE__/docs/FINAL_RANKING.md ] || { echo "isolation breach: FINAL_RANKING.md visible" >&2; exit 1; }'
  HOST_ASSERTIONS="${HOST_ASSERTIONS//__WORKSPACE__/$WORKSPACE_ROOT}"
  HOST_CMD="${SHELL_CMD//$WORKTREE_PATH/$WORKSPACE_ROOT}"
  bash -lc "$HOST_ASSERTIONS; ${HOST_CMD:-true}; echo 'isolation ok'"
  rm -rf "$DRY_ROOT"
  exit 0
fi

# Build the image if needed
echo "Building claude-runner image..."
docker build -t claude-runner "$REPO_DIR/docker"

echo "Starting Claude Code in isolated container..."
echo "  Worktree path:    $WORKTREE_PATH"
echo "  Main .git mount:  $MAIN_GIT_DIR"
echo "  Running as:      runner (non-root)"
echo "  Scoring masked:  $WORKTREE_PATH/scoring (tmpfs)"
echo "  Scratch metrics: $RUN_OUTPUT_DIR -> $WORKTREE_PATH/metrics"
echo ""

ASSERTIONS='[ -z "$(ls -A __WORKTREE__/scoring 2>/dev/null)" ] || { echo "isolation breach: scoring/ visible" >&2; exit 1; }; [ -z "$(ls -A __WORKTREE__/metrics 2>/dev/null)" ] || { echo "isolation breach: metrics/ visible" >&2; exit 1; }; [ ! -e __WORKTREE__/docs/RUN_LOG.md ] || { echo "isolation breach: RUN_LOG.md visible" >&2; exit 1; }; [ ! -e __WORKTREE__/docs/LEARNINGS.md ] || { echo "isolation breach: LEARNINGS.md visible" >&2; exit 1; }; [ ! -e __WORKTREE__/docs/EXPERIMENT_HISTORY.md ] || { echo "isolation breach: EXPERIMENT_HISTORY.md visible" >&2; exit 1; }; [ ! -e __WORKTREE__/docs/EXPERIMENT_V2_PLAN.md ] || { echo "isolation breach: EXPERIMENT_V2_PLAN.md visible" >&2; exit 1; }; [ ! -e __WORKTREE__/docs/FINAL_RANKING.md ] || { echo "isolation breach: FINAL_RANKING.md visible" >&2; exit 1; }'
ASSERTIONS="${ASSERTIONS//__WORKTREE__/$WORKTREE_PATH}"

if [[ -n "$SHELL_CMD" ]]; then
  CONTAINER_CMD="$SHELL_CMD"
else
  CONTAINER_CMD='if [[ -f "$WORKTREE_PATH/.env.local" ]]; then set -a; source "$WORKTREE_PATH/.env.local"; set +a; fi; claude --bare --dangerously-skip-permissions -p "$CLAUDE_PROMPT"'
fi

TMPFS_FLAGS=(
  --tmpfs "$WORKTREE_PATH/scoring:rw,size=1m"
  --tmpfs "$WORKTREE_PATH/docs:rw,size=8m"
)

if [[ "$NO_ISOLATION" -eq 1 ]]; then
  TMPFS_FLAGS=()
  DOC_FILE_MOUNTS=()
fi

# Only allocate a pseudo-TTY when both stdin and stdout are real terminals.
# `docker run -t` fails with "the input device is not a TTY" in programmatic
# contexts (script capture, CI, subshells). Claude --bare -p doesn't need TTY.
DOCKER_TTY_FLAGS=()
if [[ -t 0 ]] && [[ -t 1 ]]; then
  DOCKER_TTY_FLAGS=(-it)
fi

docker run "${DOCKER_TTY_FLAGS[@]+"${DOCKER_TTY_FLAGS[@]}"}" --rm \
  --name claude-runner \
  -v "$MAIN_GIT_DIR:$MAIN_GIT_DIR:rw" \
  -v "$WORKTREE_PATH:$WORKTREE_PATH:rw" \
  -v "$RUN_OUTPUT_DIR:$WORKTREE_PATH/metrics" \
  -v "$CLAUDE_DIR:/home/runner/.claude" \
  "${CLAUDE_FILE_MOUNTS[@]}" \
  "${TMPFS_FLAGS[@]}" \
  "${DOC_FILE_MOUNTS[@]}" \
  --network host \
  --ipc=host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -e CLAUDE_PROMPT="$PROMPT" \
  -e WORKTREE_PATH="$WORKTREE_PATH" \
  -w "$WORKTREE_PATH" \
  claude-runner \
  bash -lc "$ASSERTIONS; $CONTAINER_CMD"

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ -f "$RUN_OUTPUT_DIR/timing.jsonl" ]]; then
    bash "$WORKTREE_PATH/scripts/post-build-score.sh" \
      --repo "$WORKTREE_PATH" \
      --run-dir "$RUN_OUTPUT_DIR" \
      --branch "$(git -C "$WORKTREE_PATH" branch --show-current 2>/dev/null || echo "")"
  fi
fi
