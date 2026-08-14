# Architecture

> Phase 0 architecture document for the Hermes Digital Factory.
> Expands on ROADMAP.md section 4 (High-level architecture).

## 1. Overview

Hermes is an autonomous software-development environment, not a chatbot. A
user submits a natural-language project brief through an entry point (Web UI
or Telegram). The Factory Control API receives the request and hands it to
the Orchestrator, which coordinates specialized agents to plan, build, test,
and deploy the project inside an isolated sandbox. Every claim of success is
verified by a deterministic tool — never taken on the AI's word.

## 2. Component diagram

```text
                         USER
                           │
                 ┌─────────┴─────────┐
                 │                   │
             Web UI              Telegram
                 │                   │
                 └─────────┬─────────┘
                           │
                           ▼
                  FACTORY CONTROL API
                           │
                           ▼
                    ORCHESTRATOR
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
         PLANNER        CODER         REVIEWER
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                    PROJECT SANDBOX
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
      Docker             Git              Database
        │                  │                  │
        ▼                  ▼                  ▼
    Application        GitHub           PostgreSQL
        │
        ▼
   Browser Testing
        │
        ▼
    Quality Gates
        │
        ▼
     Deployment
        │
        ▼
    Production
```

## 3. Components

### Factory Control API
Public-facing entry point. Accepts project briefs and control commands
(status, logs, approve, stop) from the Web UI and Telegram. Stateless;
delegates all work to the Orchestrator.

### Orchestrator
Owns project state (see `project-lifecycle.md`) and drives the pipeline
forward one lifecycle stage at a time. Invokes agents in sequence, enforces
the autonomous debugging loop's retry limit, and halts on any state
transition that isn't explicit.

### Agents
- **Planner** — turns a brief into `requirements.md`, `architecture.md`,
  `tasks.md` for the generated project.
- **Builder/Coder** — creates and modifies project files, installs
  dependencies, implements features.
- **Tester** — runs unit, integration, and browser tests; verifies builds.
- **Debugger** — investigates and fixes failures inside the bounded retry
  loop.
- **Reviewer** — checks code quality, architecture fit, security, and
  incomplete functionality.
- **Deployment agent** — builds, deploys, health-checks, and can roll back.

Agents are specialized and single-responsibility. Hermes does not use one
giant autonomous prompt (roadmap §10).

### Project Sandbox
Isolated per-project environment (Docker) containing the project's files,
its own Git repository, and its own database. No project can affect another
project or the host outside its sandbox (see `security-model.md`).

### Deterministic tool layer
File operations, Git, Docker, testing, browser automation, database
operations, builds, and deployment are all performed by real tools and
verified by their real output — the LLM reasons and writes code, it does not
self-certify success.

## 4. Data flow (happy path)

1. User submits a brief via Web UI or Telegram.
2. Factory Control API creates a project record and manifest (`DRAFT`).
3. Orchestrator invokes Planner → project moves to `PLANNING`.
4. Human approves the plan → `APPROVED`.
5. Orchestrator invokes Builder inside the project sandbox → `BUILDING`.
6. Orchestrator invokes Tester → `TESTING`.
7. On failure, Debugger runs the bounded fix/retest loop → `FIXING`.
8. Reviewer performs quality/security review → `REVIEW`.
9. Project reaches `READY_TO_DEPLOY`; human approval gate for production.
10. Deployment agent builds, deploys, verifies → `DEPLOYING` → `DEPLOYED`.
11. Final report generated and returned to the user.

## 5. Cross-cutting concerns

- **State machine** — every project has an explicit lifecycle state; see
  `project-lifecycle.md`.
- **Manifest** — every project carries a machine-readable manifest the
  factory uses to reason about it; see `project-manifest.md`.
- **Security** — sandbox isolation, least-privilege credentials, secrets
  handling, approval gates; see `security-model.md`.
- **Environments** — always-on dev/orchestration server plus an on-demand
  GPU inference server; see `environment-strategy.md`.
- **Deployment** — deterministic, gated pipeline; see
  `deployment-strategy.md`.

## 6. Non-goals (for now)

- Multi-tenant SaaS hosting of the factory itself.
- Fully unattended production deployment without human approval gates.
- Model-specific coupling — the AI provider is abstracted so local/hosted
  models and providers can be swapped (roadmap §6).
