#!/usr/bin/env bash
# Bootstrap the Hermes Digital Factory development environment on a clean
# Ubuntu 24.04 server. Idempotent: safe to re-run.
#
# Roadmap Phase 1: Configure Ubuntu server, install Git/Docker/Node/Python/
# Playwright, configure SSH/GitHub.
set -euo pipefail

require_sudo() {
  if ! sudo -n true 2>/dev/null; then
    echo "This script requires passwordless sudo (or run interactively and enter your password when prompted)." >&2
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker already installed: $(docker --version)"
    return
  fi
  echo "Installing Docker..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "Docker installed. Log out/in (or start a new SSH session) for group membership to take effect."
}

install_playwright_deps() {
  echo "Installing Playwright browsers + OS dependencies..."
  npx --yes playwright install --with-deps || true
  # Chromium's download host (Chrome for Testing on GCS) may be geo-blocked
  # on some hosts; Firefox/WebKit use a different CDN and are not affected.
  npx --yes playwright install firefox webkit
}

check_versions() {
  echo "--- Environment versions ---"
  git --version
  docker --version
  node --version
  npm --version
  python3 --version
  psql --version
}

main() {
  require_sudo
  install_docker
  install_playwright_deps
  check_versions
  echo "Setup complete."
}

main "$@"
