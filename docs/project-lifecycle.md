# Project Lifecycle

> Phase 0 definition of project states and transitions.
> Expands on ROADMAP.md section 8.

## 1. Principle

Every project has an explicit state, stored in its manifest (`status`
field — see `project-manifest.md`). The Orchestrator is the only component
allowed to change it. A project must never silently move between states —
every transition is logged with a reason and a timestamp.

## 2. Happy-path states

```text
DRAFT
  ↓
PLANNING
  ↓
APPROVED
  ↓
BUILDING
  ↓
TESTING
  ↓
FIXING
  ↓
REVIEW
  ↓
READY_TO_DEPLOY
  ↓
DEPLOYING
  ↓
DEPLOYED
```

| State | Entered when | Exited when |
|---|---|---|
| `DRAFT` | A brief is submitted and a manifest is created | Planner starts work |
| `PLANNING` | Planner is producing requirements/architecture/tasks | Plan is complete and presented to the user |
| `APPROVED` | Human approves the plan | Builder starts work |
| `BUILDING` | Builder is generating/modifying project files | Build reaches a testable state |
| `TESTING` | Tester is running unit/integration/browser tests | All tests pass, or a failure is detected |
| `FIXING` | Debugger is investigating/fixing a test failure | Fix is applied and ready to retest (returns to `TESTING`) |
| `REVIEW` | Reviewer is checking quality/architecture/security | Review passes or raises blocking issues |
| `READY_TO_DEPLOY` | Review passed and all quality gates are green | Human approves production deployment |
| `DEPLOYING` | Deployment agent is running the deployment pipeline | Deployment finishes |
| `DEPLOYED` | Production health checks and smoke tests pass | — (terminal, until a new change starts a new cycle) |

`TESTING` ⇄ `FIXING` can loop, bounded by `maximum_attempts` (roadmap §15,
default 5). Exceeding the limit moves the project to `BLOCKED`, not back to
`TESTING`.

## 3. Failure states

```text
FAILED_BUILD
FAILED_TESTS
FAILED_DEPLOYMENT
BLOCKED
```

| State | Meaning | Recovery |
|---|---|---|
| `FAILED_BUILD` | Builder could not produce a buildable project | Human review required; may restart from `BUILDING` |
| `FAILED_TESTS` | Tests failed and the debugging loop exhausted its retry limit | Human review required |
| `FAILED_DEPLOYMENT` | Deployment pipeline failed after `READY_TO_DEPLOY` | Rollback (see `deployment-strategy.md`); human review required |
| `BLOCKED` | Any stage cannot proceed without human intervention (retry limit hit, ambiguous requirement, missing credential, etc.) | Human resolves the blocker; Orchestrator resumes from the blocking stage |

Failure states are always reachable from the state that detected the
failure, and are always exited by an explicit human or Orchestrator action
— never automatically.

## 4. Invariants

1. `status` in the manifest and the Orchestrator's internal state must
   always agree.
2. Every transition is appended to the project's log with: previous state,
   new state, timestamp, and triggering agent/event.
3. A project cannot skip states (e.g. `BUILDING` → `DEPLOYED` directly is
   invalid) except into a failure/`BLOCKED` state, which can be entered
   from any active state.
4. Only `DEPLOYED` and `BLOCKED`/`FAILED_*` (pending human action) are
   resting states; all others imply an agent is actively working.
