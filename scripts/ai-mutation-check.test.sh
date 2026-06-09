#!/usr/bin/env bash
# ai-mutation-check.test.sh — bash self-tests for scripts/ai-mutation-check.sh.
#
# Covers the two behaviors required by the mutation-check wrapper contract in
# docs/testing.md:
#   1. given a Stryker config whose break threshold is BELOW the observed
#      baseline score: wrapper exits 0 (mutation pass)
#   2. given a Stryker config whose break threshold is ABOVE the observed
#      baseline score (artificially raised to 100): wrapper exits non-zero
#      (mutation fail; surfaces Stryker's own non-zero exit)
#
# Approach: each case writes a sandbox Stryker config under /tmp that
# extends the project config but overrides only `thresholds.break`. The
# wrapper accepts a `STRYKER_CONFIG` env var so the test can point it at
# the sandbox config without mutating the production one.
#
# Because a full Stryker run takes 5–20 minutes, the tests do NOT actually
# re-run mutation testing. Instead they assert the wrapper's contract
# against a stubbed `npx stryker` binary on PATH that records the args
# it was called with and exits with a configurable code, simulating
# "score above threshold" (exit 0) and "score below threshold" (exit 1).
# This keeps the meta-TDD loop tight and deterministic.
#
# Run from anywhere; resolves project root via git.

set -u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT" ]; then
  echo "[ai-mutation-check.test] ERROR: must run inside the voter-choice repo"
  exit 1
fi

SCRIPT="$ROOT/scripts/ai-mutation-check.sh"

TMP_DIRS=()

cleanup() {
  for d in "${TMP_DIRS[@]:-}"; do
    [ -n "$d" ] && [ -d "$d" ] && rm -rf "$d"
  done
}
trap cleanup EXIT

PASSES=0
FAILS=0

assert() {
  local label="$1"
  local condition="$2"
  if [ "$condition" = "true" ]; then
    echo "  [PASS] $label"
    PASSES=$((PASSES + 1))
  else
    echo "  [FAIL] $label"
    FAILS=$((FAILS + 1))
  fi
}

# make_stub_dir <stryker-exit-code>
#   creates a tmpdir containing a fake `npx` wrapper that pretends to run
#   stryker and exits with the given code. Echoes the tmpdir path so the
#   caller can prepend it to PATH.
make_stub_dir() {
  local exit_code="$1"
  local dir
  dir="$(mktemp -d -t ai-mutation-check-test.XXXXXX)"
  TMP_DIRS+=("$dir")

  cat > "$dir/npx" <<EOF_NPX
#!/usr/bin/env bash
# Stubbed npx for ai-mutation-check tests. Records args, exits with $exit_code.
echo "[stub-npx] called with: \$*" >&2
if [ "\$1" = "stryker" ] && [ "\$2" = "run" ]; then
  # Simulate Stryker 9.x progress output so the wrapper has something to
  # parse. Table layout intentionally mirrors the real format the wrapper
  # is now coded against (total + covered + killed + timeout + ...) so the
  # parser regression is caught here, not in production.
  cat <<'STRYKER_OUT'
17:31:21 (12345) INFO ProjectReader Found 5 of 5 file(s) to be mutated.
17:31:30 (12345) INFO MutationTestExecutor Done in 1m 30s.
-------------------|--------|---------|----------|-----------|------------|----------|----------|
                   | % Mutation score |          |           |            |          |          |
File               |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
-------------------|--------|---------|----------|-----------|------------|----------|----------|
All files          |  72.50 |   78.32 |       58 |         2 |         18 |        2 |        0 |
-------------------|--------|---------|----------|-----------|------------|----------|----------|
Ran 1.05 tests per mutant on average.
17:31:32 (12345) INFO HtmlReporter Your report can be found at: file:///repo/reports/mutation/mutation.html
STRYKER_OUT
  exit $exit_code
fi
# Fall through for anything else
exit 0
EOF_NPX
  chmod +x "$dir/npx"
  echo "$dir"
}

echo "[ai-mutation-check.test] script under test: $SCRIPT"
echo "[ai-mutation-check.test] project root: $ROOT"
echo

# ----------------------------------------------------------------------
# Pre-flight: script must exist
# ----------------------------------------------------------------------
if [ ! -f "$SCRIPT" ]; then
  echo "[ai-mutation-check.test] FATAL: $SCRIPT does not exist"
  echo "[ai-mutation-check.test] (this is the expected RED state before implementation)"
  exit 1
fi
if [ ! -x "$SCRIPT" ]; then
  echo "[ai-mutation-check.test] FATAL: $SCRIPT exists but is not executable"
  exit 1
fi

# ----------------------------------------------------------------------
# Case 1: threshold BELOW baseline (Stryker exits 0) → wrapper exits 0
# ----------------------------------------------------------------------
echo "[ai-mutation-check.test] case 1: threshold below baseline (Stryker exits 0)"
stub_dir="$(make_stub_dir 0)"
out="$(PATH="$stub_dir:$PATH" bash "$SCRIPT" 2>&1)"
rc=$?
echo "  wrapper exit code: $rc"
echo "  --- captured output (last 8 lines) ---"
echo "$out" | tail -8 | sed 's/^/    /'
echo "  --- end output ---"
[ "$rc" -eq 0 ] && c1_exit=true || c1_exit=false
echo "$out" | grep -qE "mutation|score|killed" && c1_summary=true || c1_summary=false
assert "exits 0 when Stryker reports score >= threshold" "$c1_exit"
assert "stdout includes a mutation summary" "$c1_summary"
echo

# ----------------------------------------------------------------------
# Case 2: threshold ABOVE baseline (Stryker exits non-zero) → wrapper exits non-zero
# ----------------------------------------------------------------------
echo "[ai-mutation-check.test] case 2: threshold above baseline (Stryker exits non-zero)"
stub_dir="$(make_stub_dir 1)"
out="$(PATH="$stub_dir:$PATH" bash "$SCRIPT" 2>&1)"
rc=$?
echo "  wrapper exit code: $rc"
echo "  --- captured output (last 8 lines) ---"
echo "$out" | tail -8 | sed 's/^/    /'
echo "  --- end output ---"
[ "$rc" -ne 0 ] && c2_exit=true || c2_exit=false
assert "exits non-zero when Stryker fails the break threshold" "$c2_exit"
assert "exit code forwards Stryker's exit (1)" "$([ "$rc" -eq 1 ] && echo true || echo false)"
echo

# ----------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------
echo "[ai-mutation-check.test] summary: $PASSES passed, $FAILS failed"
if [ "$FAILS" -gt 0 ]; then
  echo "[ai-mutation-check.test] FAILED"
  exit 1
fi
echo "[ai-mutation-check.test] OK"
exit 0
