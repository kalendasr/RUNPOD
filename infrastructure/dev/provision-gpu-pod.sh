#!/usr/bin/env bash
# Provision the Phase 7 AI inference server: an RTX 3090 pod on RunPod.
# Idempotent: if HERMES_AI_GPU_POD_ID already resolves to a live pod, does
# nothing but print its connection info.
#
# Requires: RUNPOD_API_KEY, and a local SSH public key at ~/.ssh/id_ed25519.pub
# (injected into the pod via PUBLIC_KEY so `ssh` works immediately).
#
# Roadmap Phase 7: Configure GPU provider, configure RTX 3090.
set -euo pipefail

: "${RUNPOD_API_KEY:?Set RUNPOD_API_KEY (see .env.example)}"
PUBKEY_FILE="${PUBKEY_FILE:-$HOME/.ssh/id_ed25519.pub}"
POD_NAME="${POD_NAME:-hermes-ai-inference}"

graphql() {
  curl -s -X POST "https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}" \
    -H "content-type: application/json" \
    -d "{\"query\": \"$1\"}"
}

if [ -n "${HERMES_AI_GPU_POD_ID:-}" ]; then
  existing=$(graphql "query { pod(input: {podId: \\\"${HERMES_AI_GPU_POD_ID}\\\"}) { id desiredStatus } }")
  if echo "$existing" | grep -q '"id"'; then
    echo "Pod ${HERMES_AI_GPU_POD_ID} already exists. Nothing to provision."
    echo "$existing"
    exit 0
  fi
fi

[ -f "$PUBKEY_FILE" ] || { echo "No SSH public key at $PUBKEY_FILE — generate one first (ssh-keygen)." >&2; exit 1; }
PUBKEY=$(cat "$PUBKEY_FILE")

echo "Deploying RTX 3090 pod on RunPod community cloud..."
result=$(python3 - "$RUNPOD_API_KEY" "$PUBKEY" "$POD_NAME" << 'PYEOF'
import json, sys, urllib.request

api_key, pubkey, name = sys.argv[1], sys.argv[2], sys.argv[3]
mutation = """
mutation {
  podFindAndDeployOnDemand(input: {
    cloudType: COMMUNITY
    gpuCount: 1
    gpuTypeId: "NVIDIA GeForce RTX 3090"
    name: "%s"
    imageName: "runpod/pytorch:2.2.1-py3.10-cuda12.1.1-devel-ubuntu22.04"
    containerDiskInGb: 50
    volumeInGb: 60
    volumeMountPath: "/workspace"
    ports: "22/tcp,11434/http"
    env: [{ key: "PUBLIC_KEY", value: "%s" }]
  }) {
    id
    desiredStatus
  }
}
""" % (name, pubkey.replace('"', '\\"'))

req = urllib.request.Request(
    f"https://api.runpod.io/graphql?api_key={api_key}",
    data=json.dumps({"query": mutation}).encode(),
    headers={"content-type": "application/json"},
    method="POST",
)
print(urllib.request.urlopen(req).read().decode())
PYEOF
)

echo "$result"
pod_id=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['podFindAndDeployOnDemand']['id'])")

echo ""
echo "Pod deployed: $pod_id"
echo "Add to your environment: HERMES_AI_GPU_POD_ID=$pod_id"
echo "It takes ~30-60s to reach RUNNING; check with: hermes-ai gpu-status"
echo "Then run infrastructure/dev/setup-ollama.sh against it."
