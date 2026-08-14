#!/usr/bin/env bash
# Verify the Phase 1 acceptance criteria: Claude Code can modify the repo,
# run an application, run tests, use Docker, and commit to Git.
set -uo pipefail

pass=0
fail=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "OK   $name"
    pass=$((pass + 1))
  else
    echo "FAIL $name"
    fail=$((fail + 1))
  fi
}

check "git available"        command -v git
check "docker available"     command -v docker
check "docker daemon reachable" docker info
check "node available"       command -v node
check "npm available"        command -v npm
check "python3 available"    command -v python3
check "psql available"       command -v psql
check "playwright cli works" npx --yes playwright --version

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
