# Environment Strategy

> Phase 0 definition of the factory's infrastructure environments.
> Expands on ROADMAP.md section 5.

## 1. Two environments

The factory runs on two distinct environments with different availability
requirements:

1. **Development / orchestration server** — always on.
2. **AI inference server (GPU)** — on demand, started only when needed.

Keeping these separate lets the factory's core (orchestration, sandboxing,
Git, testing, deployment) work correctly and cheaply before local AI
inference is added at all (roadmap §7, Phase 7 comes late on purpose).

## 2. Development server

Initial target spec:

- Ubuntu 24.04 LTS
- 4 vCPU
- 8 GB RAM
- 75–100 GB NVMe

Installed software:

- Docker
- Git
- Node.js
- Python
- PostgreSQL
- Playwright (with browser dependencies)

Responsibilities:

- Running Claude Code itself
- Project orchestration (Orchestrator, agents)
- Project files and per-project sandboxes
- Git operations
- Test execution (unit, integration, browser)
- Development databases
- Deployment orchestration (triggering, not necessarily hosting production)

This server runs continuously — the factory cannot function without it.

## 3. AI inference server

Initial target spec:

- NVIDIA RTX 3090 (24 GB VRAM)
- Linux
- Ollama or a compatible inference server
- Qwen-class coding model

Unlike the dev server, the GPU does **not** need to stay online 24/7:

```text
GPU OFF
   ↓
Factory receives task
   ↓
GPU required
   ↓
Start GPU
   ↓
Run inference
   ↓
Task complete
   ↓
GPU idle
   ↓
Stop GPU
```

This is a Phase 7 concern — implemented only after the core factory
(Phases 1–6) works using a hosted/API model. The AI provider is abstracted
behind an internal interface from the start (roadmap §6) specifically so
this local-GPU swap-in doesn't require touching the rest of the system.

## 4. Degradation

The factory must continue functioning if the local GPU is unavailable —
inference falls back to the configured hosted provider. Local inference is
an optimization (cost/latency/privacy), never a hard dependency.

## 5. Provisioning approach

Both environments should be reproducible from a clean machine (roadmap
§26, rule 15): setup is captured as scripts under `infrastructure/dev/` and
`infrastructure/production/`, not as manual, undocumented steps on a
long-lived box.
