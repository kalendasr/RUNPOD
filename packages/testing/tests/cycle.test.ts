import { describe, expect, it } from "vitest";
import { runCycle } from "../src/cycle.js";
import type { FixStrategy, LifecycleDriver, ProjectStatus, StepResult, TestSteps } from "../src/types.js";

function fakeLifecycle() {
  const transitions: ProjectStatus[] = [];
  const events: string[] = [];
  const driver: LifecycleDriver = {
    transition(status) {
      transitions.push(status);
    },
    log(event) {
      events.push(event);
    },
  };
  return { driver, transitions, events };
}

const alwaysPass: StepResult = { passed: true, output: "ok" };
const alwaysFail: StepResult = { passed: false, output: "boom" };

const noOpFix: FixStrategy = {
  async attemptFix() {
    return { applied: false, description: "no fix" };
  },
};

describe("runCycle", () => {
  it("reaches REVIEW on the first attempt when everything passes", async () => {
    const { driver, transitions } = fakeLifecycle();
    const steps: TestSteps = {
      runBuild: async () => alwaysPass,
      runUnitTests: async () => alwaysPass,
      runBrowserTests: async () => alwaysPass,
    };

    const result = await runCycle(steps, driver, noOpFix, { maxAttempts: 5 });

    expect(result).toEqual({ outcome: "REVIEW", attempts: 1, reason: expect.any(String) });
    expect(transitions).toEqual(["BUILDING", "TESTING", "REVIEW"]);
  });

  it("retries through FIXING/TESTING and eventually succeeds", async () => {
    const { driver, transitions } = fakeLifecycle();
    let browserCalls = 0;
    const steps: TestSteps = {
      runBuild: async () => alwaysPass,
      runUnitTests: async () => alwaysPass,
      runBrowserTests: async () => {
        browserCalls++;
        return browserCalls < 3 ? alwaysFail : alwaysPass;
      },
    };

    const result = await runCycle(steps, driver, noOpFix, { maxAttempts: 5 });

    expect(result.outcome).toBe("REVIEW");
    expect(result.attempts).toBe(3);
    expect(transitions).toEqual([
      "BUILDING",
      "TESTING",
      "FIXING",
      "TESTING",
      "FIXING",
      "TESTING",
      "REVIEW",
    ]);
  });

  it("gives up at FAILED_TESTS after exhausting maxAttempts", async () => {
    const { driver, transitions } = fakeLifecycle();
    const steps: TestSteps = {
      runBuild: async () => alwaysPass,
      runUnitTests: async () => alwaysPass,
      runBrowserTests: async () => alwaysFail,
    };

    const result = await runCycle(steps, driver, noOpFix, { maxAttempts: 3 });

    expect(result.outcome).toBe("FAILED_TESTS");
    expect(result.attempts).toBe(3);
    expect(transitions.at(-1)).toBe("FAILED_TESTS");
    expect(transitions.filter((t) => t === "FIXING")).toHaveLength(2);
  });

  it("gives up at FAILED_BUILD without ever reaching TESTING", async () => {
    const { driver, transitions } = fakeLifecycle();
    const steps: TestSteps = {
      runBuild: async () => alwaysFail,
      runUnitTests: async () => alwaysPass,
      runBrowserTests: async () => alwaysPass,
    };

    const result = await runCycle(steps, driver, noOpFix, { maxAttempts: 2 });

    expect(result.outcome).toBe("FAILED_BUILD");
    expect(result.attempts).toBe(2);
    expect(transitions).toEqual(["BUILDING", "FAILED_BUILD", "BUILDING", "FAILED_BUILD"]);
  });

  it("does not fail the cycle when unit tests are skipped", async () => {
    const { driver } = fakeLifecycle();
    const steps: TestSteps = {
      runBuild: async () => alwaysPass,
      runUnitTests: async () => ({ passed: true, skipped: true, output: "no unit tests" }),
      runBrowserTests: async () => alwaysPass,
    };

    const result = await runCycle(steps, driver, noOpFix, { maxAttempts: 5 });
    expect(result.outcome).toBe("REVIEW");
  });
});
