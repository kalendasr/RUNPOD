import type { CycleOptions, CycleResult, FixStrategy, LifecycleDriver, TestSteps } from "./types.js";

const ACTOR = "testing-cycle";

/**
 * Drives a project through BUILDING -> TESTING -> (FIXING loop) -> REVIEW,
 * per docs/project-lifecycle.md. Two independent bounded retry loops, each
 * following the lifecycle state machine's actual allowed transitions
 * (committed in packages/projects/src/lifecycle.ts):
 *
 *   - Build failures loop via FAILED_BUILD -> BUILDING.
 *   - Test failures loop via FIXING -> TESTING.
 *
 * Both share one attempt budget (`options.maxAttempts`, roadmap section 15's
 * `maximum_attempts`, default 5) so the loop can never run forever. Exceeding
 * it lands in FAILED_BUILD or FAILED_TESTS — not a generic BLOCKED — because
 * each of those failure states already means "human review required" (see
 * docs/project-lifecycle.md's failure-state table).
 *
 * `steps` and `fixStrategy` are injected so this function has no I/O of its
 * own and can be unit-tested without Docker, npm, or a database.
 */
export async function runCycle(
  steps: TestSteps,
  lifecycle: LifecycleDriver,
  fixStrategy: FixStrategy,
  options: CycleOptions,
): Promise<CycleResult> {
  let attempt = 0;

  // --- Build phase --------------------------------------------------
  while (true) {
    attempt++;
    lifecycle.transition("BUILDING", { reason: `build attempt ${attempt}`, actor: ACTOR });
    const build = await steps.runBuild();
    lifecycle.log("build_step", { attempt, passed: build.passed });

    if (build.passed) break;

    lifecycle.transition("FAILED_BUILD", { reason: `build failed on attempt ${attempt}`, actor: ACTOR });

    if (attempt >= options.maxAttempts) {
      return {
        outcome: "FAILED_BUILD",
        attempts: attempt,
        reason: `Exceeded maximum_attempts (${options.maxAttempts}); build kept failing`,
      };
    }

    const fix = await fixStrategy.attemptFix({ attempt, failedStep: "build", output: build.output });
    lifecycle.log("fix_attempt", { attempt, failedStep: "build", applied: fix.applied, description: fix.description });
    // loop retries via FAILED_BUILD -> BUILDING
  }

  // --- Test phase -----------------------------------------------------
  lifecycle.transition("TESTING", { reason: `attempt ${attempt}: running tests`, actor: ACTOR });
  while (true) {
    const unit = await steps.runUnitTests();
    lifecycle.log("unit_test_step", { attempt, passed: unit.passed, skipped: unit.skipped });

    let failedStep: "unit" | "browser" | null = null;
    let failureOutput = "";

    if (!unit.passed && !unit.skipped) {
      failedStep = "unit";
      failureOutput = unit.output;
    } else {
      const browser = await steps.runBrowserTests();
      lifecycle.log("browser_test_step", { attempt, passed: browser.passed, skipped: browser.skipped });
      if (!browser.passed && !browser.skipped) {
        failedStep = "browser";
        failureOutput = browser.output;
      }
    }

    if (failedStep === null) {
      lifecycle.transition("REVIEW", { reason: `attempt ${attempt} passed all gates`, actor: ACTOR });
      return { outcome: "REVIEW", attempts: attempt, reason: "Build, unit tests, and browser tests all passed" };
    }

    if (attempt >= options.maxAttempts) {
      lifecycle.transition("FAILED_TESTS", {
        reason: `Exceeded maximum_attempts (${options.maxAttempts}) at ${failedStep} step`,
        actor: ACTOR,
      });
      return {
        outcome: "FAILED_TESTS",
        attempts: attempt,
        reason: `Exceeded maximum_attempts (${options.maxAttempts}); last failure at ${failedStep} step`,
      };
    }

    attempt++;
    lifecycle.transition("FIXING", { reason: `attempt ${attempt - 1} failed at ${failedStep}`, actor: ACTOR });
    const fix = await fixStrategy.attemptFix({ attempt, failedStep, output: failureOutput });
    lifecycle.log("fix_attempt", { attempt, failedStep, applied: fix.applied, description: fix.description });
    lifecycle.transition("TESTING", { reason: `retesting after attempt ${attempt}`, actor: ACTOR });
  }
}
