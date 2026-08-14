# Tests

This skill doesn't ship static test files — Playwright specs are
generated per project by `packages/website-factory/src/playwrightTests.ts`
(one spec per page, driven by the manifest's page list) and run via
`runE2ETests()` in the same package. See:

- Generator + build/test orchestration tests: `packages/website-factory/tests/`
- The BUILD→TEST→FIX cycle these results feed into: [`../testing/SKILL.md`](../testing/SKILL.md)
