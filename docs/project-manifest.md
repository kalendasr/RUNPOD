# Project Manifest

> Phase 0 definition for the machine-readable project manifest.
> Expands on ROADMAP.md section 9.

## 1. Purpose

Every generated project must carry a manifest describing what it is, what
it's made of, and where it stands. The factory (Orchestrator, agents,
dashboard) reads the manifest instead of inferring project state from
source code — it is the single source of truth for "what is this project."

The manifest lives at the root of each generated project as `hermes.yaml`.

## 2. Schema

```yaml
name: string              # unique project slug, e.g. construction-quotes
type: enum                # website | saas | ecommerce | ai-saas
status: enum               # see project-lifecycle.md for the full state list

stack:
  frontend: string          # e.g. nextjs
  language: string          # e.g. typescript
  database: string          # e.g. postgresql
  orm: string                # e.g. prisma

features:
  - string                   # e.g. authentication, customers, pdf, email

deployment:
  provider: string           # e.g. docker

testing:
  unit: boolean
  integration: boolean
  browser: boolean
```

## 3. Field rules

- `name` — lowercase, kebab-case, unique across the factory's project
  registry. Used as the sandbox/container/repo name.
- `type` — determines which template and skill set the Planner draws from.
  Must be one of the supported project types (extensible; see roadmap §1).
- `status` — must always equal the project's current lifecycle state.
  The Orchestrator is the only writer of this field.
- `stack` — populated by the Planner during `PLANNING`; immutable once the
  project reaches `APPROVED` unless a human explicitly requests a change.
- `features` — the checklist the Builder works through and the Tester
  verifies against. Must match `tasks.md` produced by the Planner.
- `deployment.provider` — identifies which deployment strategy
  (`deployment-strategy.md`) applies to this project.
- `testing` — flags which test types are required for this project to pass
  its quality gates. A project with `browser: true` cannot reach
  `READY_TO_DEPLOY` without passing Playwright tests.

## 4. Lifecycle of the manifest itself

- Created (as `DRAFT`) the moment a project is registered.
- Updated by the Orchestrator on every lifecycle transition.
- Updated by the Builder as features are completed (future: per-feature
  status, not just project-level status).
- Never hand-edited by an agent outside the Orchestrator's control — this
  keeps "never silently move between states" (roadmap §8) enforceable.

## 5. Extensibility

New top-level fields must be additive and optional to avoid breaking
existing manifests. New `type` values (e.g. a future `mobile` type) require
a corresponding template and skill set before they can be selected.
