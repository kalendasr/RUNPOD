import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { projectDir } from "../src/paths.js";
import { runE2ETests } from "../src/e2e.js";

const TEST_NAME = "test-website-e2e-no-scaffold";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("runE2ETests", () => {
  it("resolves with passed:false instead of crashing when the next binary doesn't exist", async () => {
    // Reproduces a real incident: with no node_modules/.bin/next (project
    // never had npm install run), spawn() emits an ENOENT 'error' event.
    // Previously nothing listened for it, so Node treated it as an
    // uncaught exception and killed the whole host process (factory-api),
    // not just this call. TestSteps.runBrowserTests must never throw.
    fs.mkdirSync(projectDir(TEST_NAME), { recursive: true });

    const result = await runE2ETests(TEST_NAME, 39231);

    expect(result.passed).toBe(false);
    expect(result.output).toMatch(/failed to start|ENOENT/i);
  }, 10000);
});
