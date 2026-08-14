# Orchestrator — Autonomous Digital Factory

> Phase 11 implementation of the pipeline described in ROADMAP.md §11:
> IDEA → PLANNER → BUILDER → TESTER → DEBUGGER → (human takes it from there).

## 1. Principle

`packages/orchestrator` wires together everything built in Phases 0–10
into one callable pipeline — it introduces almost no new mechanism of its
own. The one genuinely new piece of reasoning is the Planner (what to
build); everything after that reuses existing, already-tested
infrastructure:

| Stage | Component | Phase it was built in |
|---|---|---|
| Planner | `plan.ts`'s `planProject()` | **11** (new) |
| Architect | folded into the Planner's `architecture.md` output | **11** (new) |
| Builder | `build.ts`'s `buildProject()` — drives `@hermes/website-factory`/`@hermes/saas-factory` | 3, 4 (reused) |
| Tester | `@hermes/testing`'s `runCycle()` | 5 (reused) |
| Debugger | `fixStrategy.ts`'s `AIFixStrategy` | **11** (new) |
| Security review | `@hermes/security`'s `scanForSecrets()`, enforced in the deploy pipeline | 10 (reused) |
| Human approval | `approve: true` gate on `POST /projects/:name/deploy` | 8, 9 (reused) |
| Deployment | `@hermes/deployment`'s `deployProject()` | 6 (reused) |
| Production | health check + smoke test | 6 (reused) |

This follows directly from roadmap §2's Core principle: the LLM reasons
(Planner, Debugger), deterministic tools do file operations, builds,
tests, and deployment (everything else). Nothing in this package writes
free-form application code from scratch — the Builder only ever calls the
same generators the CLIs from Phases 3–4 call.

## 2. Planner

`planProject(provider, brief)` sends the brief to whichever `@hermes/ai`
provider is configured, with a system prompt asking for a JSON plan:
`type`, `projectName`, `siteName`, `siteDescription`, and either `pages`
(website) or `entities` (saas/ecommerce/ai-saas), plus `requirements` and
`architecture` markdown content.

If the brief isn't a build request at all (a greeting, a question), the
model responds `{"unrecognized": true}` and `planProject` throws
`PlanDeclinedError` — callers (the Telegram bot, `factory-api`) turn this
into "I couldn't understand that as a build request" rather than
half-building something from a non-brief.

A malformed individual entity (bad casing, no fields) is dropped rather
than failing the whole plan — one bad field from the model shouldn't sink
an otherwise-usable plan.

## 3. Builder

`buildProject(planResult)`:

1. `createProject()` (Phase 2) — manifest, `tasks.md`, sandbox.
2. Writes `requirements.md`/`architecture.md` from the Planner's output
   into the project directory (roadmap §10's stated Planner output).
3. For `website`: `scaffoldWebsite()` + `writePlaywrightTests()`.
4. For `saas`/`ecommerce`/`ai-saas`: `scaffoldSaas()`, then
   `generateEntityCrud()` once per planned entity.

## 4. Debugger

`AIFixStrategy` implements `@hermes/testing`'s `FixStrategy` interface —
it's a drop-in replacement for `NoOpFixStrategy` within `runCycle()`. On a
failure it:

1. Looks for a file path mentioned in the failure output (a regex over
   common `path/to/file.tsx:12:5` patterns from build/lint output).
2. If found, reads that file's current content and includes it in the prompt.
3. Asks the AI provider for `{filePath, newContent, description}` (or
   `{"noFix": true}` if it can't identify one).
4. **Validates the path stays inside the project directory** before
   writing anything — rejects `..`, rejects absolute paths
   (`docs/security-model.md` § Isolation: "agents do not read or write
   outside" their project). See
   `packages/orchestrator/tests/fixStrategy.test.ts` for the path-escape
   test cases.
5. Writes the file and returns `applied: true`.

Critically, `AIFixStrategy` never claims its own success — `applied: true`
just means "a file was written." The bounded `runCycle()` loop
(unchanged from Phase 5) re-runs the actual build/test after every fix
attempt; only a real, passing re-run advances the project. This is
roadmap §2's Core principle applied directly: never trust the AI's own
claim that something worked.

## 5. The full pipeline

`runAutonomousPipeline(provider, brief, options)`:

```text
planProject(brief)
  ↓
buildProject(plan)          — createProject, requirements.md/architecture.md, scaffold
  ↓
transition DRAFT -> PLANNING -> APPROVED
  ↓
runCycle(realSteps, realLifecycle, AIFixStrategy, {maxAttempts})
  ↓
REVIEW?  -> transition to READY_TO_DEPLOY, stop.
FAILED_* -> stop; project stays in its failure state for human review.
```

It **never deploys**. `readyToDeploy: true` in the result means "call
`POST /projects/:name/deploy` with `{ approve: true }` when a human is
ready" — same gate as every other entry point.

## 6. Entry points

- CLI: `hermes-orchestrator run "<brief>"` (and `plan "<brief>"` for a
  plan-only preview, no scaffolding).
- API: `POST /projects/autonomous { "brief": "..." }` — `apps/factory-api`.
- Telegram: any non-slash-command message. Sends an immediate
  acknowledgment (a real run is 1–2+ minutes — real npm install, build,
  and Playwright tests, not instant) before the pipeline result arrives as
  a second message. See `docs/telegram-bot.md` — this replaced Phase 9's
  standalone `nlIntent.ts`, which only classified intent and called bare
  `createProject()`; that's now fully superseded by the real pipeline, so
  it was deleted rather than kept alongside it.

## 7. Multiple projects, verified independent

Each project already lived in its own directory with its own manifest,
log, and task file (Phase 2) — nothing in the orchestrator introduces
shared mutable state. Verified live, not just asserted:
`packages/orchestrator/tests/concurrentProjects.integration.test.ts` runs
two autonomous pipelines concurrently for two different projects (real
Docker sandboxes, real npm builds) and asserts each ends up with only its
own plan's features and files — no cross-contamination.

## 8. Manual /test vs. the autonomous pipeline's AI Debugger

`apps/factory-api`'s `POST /projects/:name/test` (Phase 9) deliberately
still uses `NoOpFixStrategy`, not `AIFixStrategy` — it's for re-testing a
project as-is. `AIFixStrategy` only runs inside a pipeline the
orchestrator itself is driving (`POST /projects/autonomous`), so calling
`/test` on an existing project never has its files silently rewritten out
from under a human who's been editing it by hand.

## 9. Verified live against a real model

Every stage above is unit/integration tested against fake providers and
real Docker, but the one thing those can't prove is that a real model
produces a usable plan. Ran the actual CLI against a live
`qwen2.5-coder:32b` on a RunPod RTX 3090 (see `docs/ai-provider.md`) with
the brief:

> "Build me a simple landing page for a coffee shop called Sunrise Beans,
> with a page about our story and a way for customers to contact us."

The model produced a valid plan (`type: website`, three pages, sensible
`requirements.md`/`architecture.md` content) on the first response — no
retry needed. `hermes-orchestrator run "..."` then took that plan all the
way through a real `npm install`, `next build`, and Playwright E2E run to
`READY_TO_DEPLOY` in one attempt, no AI fix needed. Inspected the
generated `app/about/page.tsx` — real, correct, on-brief content, not a
placeholder.

