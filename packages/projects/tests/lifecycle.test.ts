import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { createManifest, writeManifest } from "../src/manifest.js";
import { transition, canTransition, InvalidTransitionError } from "../src/lifecycle.js";
import { readLog } from "../src/logs.js";
import { projectDir } from "../src/paths.js";

const TEST_NAME = "test-lifecycle-project";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("lifecycle", () => {
  it("allows DRAFT -> PLANNING and logs it", () => {
    writeManifest(createManifest({ name: TEST_NAME, type: "website" }));
    const to = transition(TEST_NAME, "PLANNING", { reason: "starting planning", actor: "test" });
    expect(to).toBe("PLANNING");
    const log = readLog(TEST_NAME);
    expect(log.at(-1)).toMatchObject({ event: "status_transition", from: "DRAFT", to: "PLANNING" });
  });

  it("rejects skipping states", () => {
    writeManifest(createManifest({ name: TEST_NAME, type: "website" }));
    expect(() => transition(TEST_NAME, "DEPLOYED", { reason: "nope", actor: "test" })).toThrow(
      InvalidTransitionError,
    );
  });

  it("allows entering BLOCKED from any active state and resuming", () => {
    writeManifest(createManifest({ name: TEST_NAME, type: "website" }));
    transition(TEST_NAME, "PLANNING", { reason: "go", actor: "test" });
    transition(TEST_NAME, "BLOCKED", { reason: "waiting on human", actor: "test" });
    const resumed = transition(TEST_NAME, "PLANNING", { reason: "resolved", actor: "test" });
    expect(resumed).toBe("PLANNING");
  });

  it("treats DEPLOYED as terminal", () => {
    expect(canTransition("DEPLOYED", "BLOCKED")).toBe(false);
  });
});
