#!/usr/bin/env bash
# ai-verify — run available deterministic checks without inventing commands.
# Usage: scripts/ai-verify.sh [--staged]

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

run() {
  echo "[ai-verify] $*"
  "$@"
  rc=$?
  [ $rc -ne 0 ] && failed=1
}

failed=0

if [ -f package.json ]; then
  if command -v npm >/dev/null 2>&1; then
    npm run lint --if-present >/tmp/ai-verify-lint.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then echo "[ai-verify] npm run lint --if-present: ok/skipped"; else failed=1; echo "[ai-verify] npm run lint --if-present: failed"; cat /tmp/ai-verify-lint.log; fi
    npm test --if-present >/tmp/ai-verify-test.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then echo "[ai-verify] npm test --if-present: ok/skipped"; else failed=1; echo "[ai-verify] npm test --if-present: failed"; cat /tmp/ai-verify-test.log; fi
    npm run build --if-present >/tmp/ai-verify-build.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then echo "[ai-verify] npm run build --if-present: ok/skipped"; else failed=1; echo "[ai-verify] npm run build --if-present: failed"; cat /tmp/ai-verify-build.log; fi
  else
    echo "[ai-verify] npm not found; package.json checks skipped"
  fi
fi

if [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -d tests ]; then
  if command -v pytest >/dev/null 2>&1; then
    run pytest
  else
    echo "[ai-verify] pytest not found; Python tests skipped"
  fi
fi

if [ -f Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
  run cargo test
fi

if [ -f go.mod ] && command -v go >/dev/null 2>&1; then
  run go test ./...
fi

if [ $failed -ne 0 ]; then
  echo "[ai-verify] failed"
  exit 1
fi

echo "[ai-verify] complete"
exit 0
