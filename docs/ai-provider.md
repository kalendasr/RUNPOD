# AI Provider

> Phase 7 implementation of the AI abstraction described in
> ROADMAP.md §6 and §7, and `environment-strategy.md` §3–4.

## 1. Principle

The factory never depends on one AI provider. `packages/ai` exposes a
single `AIProvider` interface; everything that needs a model calls through
a `ProviderRouter`, never a concrete provider. This is what lets local and
hosted models — and future providers — be swapped without touching the
rest of the system.

## 2. Providers

| Provider | File | Role |
|---|---|---|
| `OllamaProvider` | `src/ollamaProvider.ts` | Local GPU inference via Ollama |
| `HostedProvider` | `src/hostedProvider.ts` | Anthropic-compatible Messages API fallback |
| `ProviderRouter` | `src/router.ts` | Prefers local, falls back to hosted |

`ProviderRouter.complete()` checks `primary.isAvailable()` first. If the
local provider is unreachable, or throws mid-request, it falls back to the
hosted provider automatically. `RoutedCompletionResult.fellBack` reports
which path was taken. The factory must keep functioning with the GPU off
(§4 of `environment-strategy.md`) — this is how.

## 3. Local inference server

Provisioned on RunPod: 1x RTX 3090 (24GB VRAM), Ollama, `qwen2.5-coder:32b`.

Measured on this hardware:

| Context (`num_ctx`) | GPU/CPU split | Generation | Prompt eval |
|---|---|---|---|
| 32768 (Ollama default) | 83%/17% | 8.2 tok/s | 71 tok/s |
| 4096 | 100% GPU | 37.5 tok/s | 992 tok/s |

The default context window overflows 24GB and spills layers to CPU,
cutting generation speed by ~4.6x. `OllamaProvider` defaults `num_ctx` to
4096 for this reason — override via `HERMES_AI_LOCAL_NUM_CTX` only if
running a smaller model or more VRAM.

Ollama must be started with `OLLAMA_HOST=0.0.0.0:11434` — the default
`127.0.0.1` bind is invisible to RunPod's HTTP proxy and to any other
machine.

## 4. GPU start/stop

`packages/ai/src/gpu.ts` wraps the RunPod GraphQL API:

- `podStatus(config)` — `RUNNING` / `EXITED` / `UNKNOWN`
- `startGpu` / `stopGpu` — `podResume` / `podStop` mutations
- `waitUntilRunning` — polls until the pod reports an active runtime
- `withGpu(config, fn)` — starts the pod if it's off, runs `fn`, stops it
  again only if it wasn't already running (idempotent — never stops a pod
  something else is using)

CLI: `hermes-ai gpu-status`, `hermes-ai gpu-start`, `hermes-ai gpu-stop`.

The pod is **left running** by default during active development — call
`gpu-stop` explicitly (or use `withGpu`) once a task is done, to avoid
paying for idle GPU time.

## 5. Configuration

All configuration comes from environment variables (roadmap §19 — never
hard-code credentials). See `.env.example`:

```text
HERMES_AI_OLLAMA_URL
HERMES_AI_LOCAL_MODEL
HERMES_AI_LOCAL_NUM_CTX
HERMES_AI_HOSTED_URL
HERMES_AI_HOSTED_API_KEY
HERMES_AI_HOSTED_MODEL
RUNPOD_API_KEY
HERMES_AI_GPU_POD_ID
```

`providerFromEnv()` / `gpuConfigFromEnv()` in `src/config.ts` build the
router and GPU config from these.

## 6. Degradation

If `RUNPOD_API_KEY` / `HERMES_AI_GPU_POD_ID` are unset, `packages/ai`'s
completion path still works — `ProviderRouter` simply finds the local
provider unavailable and always uses hosted. GPU control (`gpu.ts`) is the
only part that hard-requires RunPod credentials, and nothing else in the
factory depends on it.
