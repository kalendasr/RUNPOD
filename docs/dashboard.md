# Factory Dashboard

> Phase 8 implementation of the visual interface described in ROADMAP.md §21.

## 1. Two apps, per repository structure (roadmap §7)

- **`apps/factory-api`** — Express/TypeScript API. Thin: it has no state of
  its own, and reads/writes only through the packages that already own
  each concern (`@hermes/projects`, `@hermes/deployment`, `@hermes/ai`).
  It never talks to Docker, the filesystem, or RunPod directly.
- **`apps/control-panel`** — Next.js/Tailwind UI. Talks only to
  factory-api, never to the packages directly (mirrors the architecture
  diagram: Web UI → Factory Control API → everything else).

## 2. API

| Route | Purpose |
|---|---|
| `GET /projects` | List all projects: name, type, status |
| `GET /projects/:name` | Full summary: manifest, tasks, latest test results, deployment history, recent log |
| `GET /projects/:name/logs` | Full project log |
| `POST /projects/:name/deploy` | Deploy — see § Approval controls |
| `GET /gpu/status` | RunPod pod status (RUNNING/EXITED) |
| `GET /costs/gpu` | GPU cost estimate from recorded sessions |

Test results shown in the dashboard aren't a separate store — `summarizeTests()`
(`apps/factory-api/src/projectSummary.ts`) derives them by scanning the
project's log for the most recent `build_step` / `unit_test_step` /
`browser_test_step` events, which `packages/testing`'s cycle already writes.

## 3. Approval controls

`POST /projects/:name/deploy` is the human-approval gate from
`docs/security-model.md` § Human approval gates, moved from the CLI's
`--yes` flag to a UI button: it refuses to call `deployProject()` unless
the request body has `{ approve: true }`. The dashboard's "Approve &
Deploy" button always confirms with the human via a native `confirm()`
dialog before sending that request — Hermes prepares the deployment but a
person triggers it, same rule as the CLI, different surface.

Every approved request is logged (`deploy_approved` event, with the
approver) before the pipeline runs, and any pipeline failure is caught and
returned as a normal JSON error — never an unhandled crash. (Verified live
against a real project: an unapproved request is rejected with 400, an
approved one reaches the actual `deployProject()` pipeline.)

## 4. Cost tracking

`packages/ai`'s `gpuSessions.ts` records every GPU start/stop initiated
through `startGpu()`/`stopGpu()` to `.hermes/gpu-sessions.json` (repo-root,
gitignored — runtime state, not source). `costs.ts` turns that into an
hourly-rate estimate. The `/costs` page shows total GPU hours, estimated
spend, and the raw session list.

This is an estimate, not a billing-accurate figure — it only counts
sessions the factory itself started/stopped, not pods started or stopped
directly in the RunPod dashboard (roadmap §22 predates having real GPU
infrastructure to track; this is the first real data source for it).
Per-project storage/deployment cost tracking is not implemented yet.

## 5. Known gap

The deployment pipeline (`packages/deployment/src/pipeline.ts`) doesn't
catch an exception thrown by the Docker build step itself — only
health-check/smoke-test failures transition to `FAILED_DEPLOYMENT`. A
build-time crash leaves the project stuck in `DEPLOYING` with no valid
transition back to `READY_TO_DEPLOY` (see `packages/projects/src/lifecycle.ts`'s
`TRANSITIONS` table). Reproduced while testing the dashboard's deploy
button; tracked as a follow-up, not fixed as part of Phase 8.

## 6. Running locally

```bash
npm run --workspace=@hermes/factory-api dev    # http://localhost:4100
npm run --workspace=@hermes/control-panel dev  # http://localhost:4200
```

`apps/control-panel` reads the API's base URL from
`NEXT_PUBLIC_FACTORY_API_URL` (defaults to `http://localhost:4100`).
