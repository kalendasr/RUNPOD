# Skill: deployment

> Deterministic build → health-check → smoke-test → deploy pipeline, with
> automatic rollback. Roadmap §17; `docs/deployment-strategy.md`.

## When the Planner selects this

Every project that reaches `READY_TO_DEPLOY` goes through this.

## What it provides

`packages/deployment`:

- `pipeline.ts` — `deployProject()`. `READY_TO_DEPLOY → DEPLOYING →`
  (build → run container → health check → smoke test) `→ DEPLOYED` or
  `FAILED_DEPLOYMENT` with an automatic rollback attempt to the last
  successful deployment.
- `dockerBuild.ts` / `containers.ts` — build/run/stop the production Docker image.
- `healthCheck.ts` / `smokeTest.ts` — the two gates a deploy must pass.
- `rollback.ts` — rolls back to `lastSuccessfulDeployment()` on failure.
- `state.ts` — per-project deployment history (`.hermes-deploy.json`).

## Key decision: every failure mode reaches FAILED_DEPLOYMENT, never a stuck DEPLOYING

This wasn't always true — a Docker build exception used to leave a
project stuck in `DEPLOYING` forever, with no valid transition back out
(see `packages/projects/src/lifecycle.ts`'s `TRANSITIONS` table: only
`DEPLOYED`/`FAILED_DEPLOYMENT`/`BLOCKED` are reachable from `DEPLOYING`).
Found live while testing the Phase 8 dashboard's deploy button. If you add
a new step to the pipeline, make sure any exception it can throw is caught
and routed to the same `FAILED_DEPLOYMENT` + rollback path as the existing
health-check/smoke-test failures — don't let a new failure mode bypass it.

## Related skills

- [`../security/SKILL.md`](../security/SKILL.md) — `scanForSecrets()` runs
  as the pipeline's "Security checks" step, right after entering
  `DEPLOYING` and before the Docker build; any finding fails the deploy
- [`../testing/SKILL.md`](../testing/SKILL.md) — what has to pass before a project even reaches `READY_TO_DEPLOY`

## Human approval gate

Deployment never runs unattended. CLI: `hermes-deploy run <name> --yes`.
Dashboard: an "Approve & Deploy" button behind a confirm dialog. Telegram:
`/deploy <name> confirm` (a deliberate second message, not a single tap).
All three ultimately require the caller to pass `{ approve: true }` to
`apps/factory-api`'s `POST /projects/:name/deploy` — see
`docs/security-model.md` § Human approval gates.

## Tests

`packages/deployment/tests/state.test.ts`, `tests/pipeline.test.ts` (the
stuck-in-DEPLOYING regression above).
