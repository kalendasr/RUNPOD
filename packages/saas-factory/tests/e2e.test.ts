import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { projectDir } from "../src/paths.js";
import { runE2ETests } from "../src/e2e.js";

const TEST_NAME = "test-saas-e2e-no-scaffold";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("runE2ETests", () => {
  it("resolves with passed:false instead of crashing when the next binary doesn't exist", async () => {
    // See packages/website-factory/tests/e2e.test.ts for the incident this
    // reproduces — an unhandled spawn 'error' event crashed the whole host
    // process (factory-api), not just this call.
    fs.mkdirSync(projectDir(TEST_NAME), { recursive: true });

    const result = await runE2ETests(TEST_NAME, 39232);

    expect(result.passed).toBe(false);
    expect(result.output).toMatch(/failed to start|ENOENT/i);
  }, 10000);
});
