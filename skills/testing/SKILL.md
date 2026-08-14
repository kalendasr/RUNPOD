# Skill: testing

> The bounded BUILD → TEST → FIX loop every project runs through.
> Roadmap §15; `docs/project-lifecycle.md`.

## When the Planner selects this

Every project — this is the mechanism that decides whether a project
reaches `REVIEW`/`READY_TO_DEPLOY` or `FAILED_BUILD`/`FAILED_TESTS`.

## What it provides

`packages/testing`:

- `cycle.ts` — `runCycle()`, the bounded retry loop. Two independent
  budgets sharing one `maxAttempts` (default 5, roadmap §15): build
  failures loop `FAILED_BUILD → BUILDING`, test failures loop
  `FIXING → TESTING`. Exceeding the budget lands in `FAILED_BUILD`/
  `FAILED_TESTS` — never a silent retry-forever, never a generic `BLOCKED`
  (those failure states already mean "human review required").
- `realSteps.ts` — the actual build/unit-test/browser-test commands for
  `website` vs `saas`/`ecommerce`/`ai-saas` projects (they currently share
  one toolchain — see the comment there before assuming a divergent path
  exists for `ecommerce`).
- `fixStrategy.ts` — pluggable auto-fix; `NoOpFixStrategy` (the current
  default) just escalates rather than guessing at a fix. No AI-driven
  fixer is wired in yet — that needs a local/hosted model in the loop
  (`../../skills/*` don't cover this; see roadmap Phase 7's
  `packages/ai` for the provider abstraction a real fix strategy would use).

## Key decision: `TestSteps` methods never throw

`runBuild`/`runUnitTests`/`runBrowserTests` all return
`Promise<StepResult>` (`{ passed, output, skipped? }`), never a rejected
promise. This was violated once — see
[`../website/SKILL.md`](../website/SKILL.md) and
`packages/website-factory/tests/e2e.test.ts`'s regression test for the
incident (an unhandled `spawn` error crashed the whole host process, not
just one test run). If you add a new `TestSteps` implementation, catch
everything at its boundary; nothing upstream expects it to throw.

## Related skills

- [`../security/SKILL.md`](../security/SKILL.md) — enforced at deploy time (`packages/deployment`), not inside this loop; a project can reach `REVIEW` with a secret still in its source, and only get caught when it tries to deploy
- [`../deployment/SKILL.md`](../deployment/SKILL.md) — what happens after `REVIEW`

## Tests

`packages/testing/tests/cycle.test.ts` — the loop's retry/budget logic
against fake `TestSteps`/`LifecycleDriver`, so it's tested without Docker,
npm, or a database.
