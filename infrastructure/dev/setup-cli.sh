#!/usr/bin/env bash
# Install and authenticate the RunPod command-line tools: runpodctl and flash.
# Idempotent: anything already installed and working is left alone, so this is
# safe to re-run. Pass --force to reinstall regardless.
#
# Requires: RUNPOD_API_KEY, read from the environment or from .env at the repo
# root. The same key authenticates both CLIs.
#
# runpodctl installs to /usr/local/bin and needs root, so this uses sudo for
# that step only. flash installs per-user via uv, which is itself installed to
# ~/.local/bin if missing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FORCE=""
[ "${1:-}" = "--force" ] && FORCE=1

# Key resolution: environment wins, then .env. runpodctl does not read .env
# itself despite what its docs suggest, so we write ~/.runpod/config.toml below.
if [ -z "${RUNPOD_API_KEY:-}" ] && [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env"
  set +a
fi
: "${RUNPOD_API_KEY:?Set RUNPOD_API_KEY in the environment or .env (see .env.example)}"

export PATH="$HOME/.local/bin:$PATH"

# --- runpodctl ---------------------------------------------------------------
if [ -z "$FORCE" ] && command -v runpodctl > /dev/null 2>&1; then
  echo "runpodctl already installed: $(runpodctl version)"
else
  echo "Installing runpodctl (requires sudo)..."
  curl -sSL https://cli.runpod.net | sudo bash
fi

# --- flash (via uv) ----------------------------------------------------------
if ! command -v uv > /dev/null 2>&1; then
  echo "Installing uv (flash is distributed as a uv tool)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

if [ -z "$FORCE" ] && command -v flash > /dev/null 2>&1; then
  echo "flash already installed: $(flash --version)"
else
  echo "Installing runpod-flash..."
  uv tool install ${FORCE:+--force} runpod-flash
fi

# --- credentials -------------------------------------------------------------
# Persist the key so both CLIs work from any directory without sourcing .env.
# 0600 because runpodctl writes this file world-readable by default.
# `config` warns that it is deprecated in favour of `doctor`, but doctor is
# interactive and takes no --apiKey, so this stays until it gains one.
runpodctl config --apiKey "$RUNPOD_API_KEY" > /dev/null
chmod 600 "$HOME/.runpod/config.toml"
echo "Wrote credentials to ~/.runpod/config.toml (mode 0600)."

# --- verify ------------------------------------------------------------------
# A successful install is not a working one; confirm each CLI reaches the API.
echo ""
echo "Verifying runpodctl..."
runpodctl user

echo ""
echo "Verifying flash..."
flash app list

echo ""
echo "Done. Both CLIs are installed and authenticated."
if ! bash -lc 'command -v flash' > /dev/null 2>&1; then
  echo "Note: ~/.local/bin is not on your PATH in a login shell — add it to use flash directly."
fi
