#!/usr/bin/env bash
# Install Ollama and pull the factory's local coding model on a GPU pod.
# Run this against the pod's SSH host, e.g.:
#   ssh <pod-host> 'bash -s' < infrastructure/dev/setup-ollama.sh
#
# Roadmap Phase 7: Install inference server, install coding model.
set -euo pipefail

MODEL="${HERMES_AI_LOCAL_MODEL:-qwen2.5-coder:32b}"

if ! command -v zstd >/dev/null 2>&1; then
  echo "Installing zstd (required by the Ollama installer)..."
  apt-get update -qq && apt-get install -y -qq zstd
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo "Starting Ollama (bound to 0.0.0.0 so RunPod's proxy and other hosts can reach it)..."
  # 127.0.0.1 (Ollama's default bind) is invisible to RunPod's HTTP proxy —
  # this cost real debugging time the first time (see docs/ai-provider.md §3).
  OLLAMA_HOST=0.0.0.0:11434 nohup ollama serve > /var/log/ollama.log 2>&1 &
  sleep 3
fi

curl -sf http://127.0.0.1:11434/api/version || { echo "Ollama did not start; check /var/log/ollama.log" >&2; exit 1; }

echo "Pulling $MODEL (this can take several minutes)..."
ollama pull "$MODEL"

echo "Done. Loaded models:"
ollama list

echo ""
echo "Note: the default 32768 context window overflows 24GB VRAM and spills"
echo "to CPU (~4.6x slower). Always pass num_ctx=4096 in requests, or rely on"
echo "OllamaProvider's default (see docs/ai-provider.md §3)."
