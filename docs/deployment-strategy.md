# Deployment Strategy

> Phase 0 definition of the deployment strategy.
> Expands on ROADMAP.md section 17.

## 1. Principle

Deployment is a deterministic pipeline, not an AI decision. The AI's job
ends at "the code and tests are ready"; every step from there is a real,
scriptable, verifiable operation. If any mandatory step fails, the
pipeline halts — it never proceeds on a hope that a later step will fix
things.

## 2. Pipeline

```text
Git commit
 ↓
Install dependencies
 ↓
Type check
 ↓
Lint
 ↓
Unit tests
 ↓
Integration tests
 ↓
Production build
 ↓
Security checks
 ↓
Docker build
 ↓
Deploy
 ↓
Health check
 ↓
Smoke tests
 ↓
LIVE
```

Each step is a gate: failure at any mandatory step produces
`DEPLOYMENT BLOCKED` (see `project-lifecycle.md` → `FAILED_DEPLOYMENT`),
not a partial or "best effort" deployment.

## 3. Step definitions

| Step | Verifies |
|---|---|
| Install dependencies | Lockfile resolves cleanly, no missing packages |
| Type check | `tsc`/equivalent passes with no errors |
| Lint | ESLint (or project-appropriate linter) passes |
| Unit tests | Isolated logic behaves as specified |
| Integration tests | Components work together (DB, API routes, etc.) |
| Production build | The app actually builds in production mode |
| Security checks | No exposed secrets, dependency vulnerabilities addressed (ties into `security-model.md`) |
| Docker build | The production image builds successfully |
| Deploy | Image is pushed/started on the target (Docker Compose/production host) |
| Health check | The running service responds correctly post-deploy |
| Smoke tests | Critical user flows work against the live deployment |

## 4. Approval gate

Reaching the end of the pipeline requires the project to already be
`READY_TO_DEPLOY` — which itself required a passed Reviewer stage and,
per `security-model.md`, explicit human approval for production
deployment. The pipeline does not grant itself permission to go live.

## 5. Rollback

If health checks or smoke tests fail after `Deploy`, the previous known-good
deployment is restored automatically, and the project moves to
`FAILED_DEPLOYMENT` for human review. Rollback is itself a scripted,
tested operation — not a manual recovery procedure.

## 6. Environments

- **Development**: Docker Compose, run continuously on the dev server
  (`environment-strategy.md`).
- **Production**: Docker, deployed per-project; Cloudflare used where
  appropriate (DNS/CDN/edge protection).

## 7. Logging

Every pipeline run is logged end-to-end (step, result, duration, output)
so a failed deployment can be diagnosed without re-running it — this feeds
the future dashboard's deployment log view (roadmap §21).
