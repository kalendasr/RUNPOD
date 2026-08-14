import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { projectDir } from "@hermes/projects";
import { recordDeployment, lastSuccessfulDeployment, readState } from "../src/state.js";

const TEST_NAME = "test-deployment-state-project";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("deployment state", () => {
  it("returns an empty state when nothing has been deployed yet", () => {
    expect(readState(TEST_NAME)).toEqual({ deployments: [] });
    expect(lastSuccessfulDeployment(TEST_NAME)).toBeUndefined();
  });

  it("records deployments in order and finds the latest success", () => {
    recordDeployment(TEST_NAME, { tag: "1", status: "success", port: 4000, timestamp: "t1" });
    recordDeployment(TEST_NAME, { tag: "2", status: "failed", port: 4000, timestamp: "t2" });
    recordDeployment(TEST_NAME, { tag: "3", status: "success", port: 4000, timestamp: "t3" });
    recordDeployment(TEST_NAME, { tag: "4", status: "failed", port: 4000, timestamp: "t4" });

    expect(readState(TEST_NAME).deployments).toHaveLength(4);
    expect(lastSuccessfulDeployment(TEST_NAME)?.tag).toBe("3");
  });

  it("returns undefined when every deployment has failed", () => {
    recordDeployment(TEST_NAME, { tag: "1", status: "failed", port: 4000, timestamp: "t1" });
    expect(lastSuccessfulDeployment(TEST_NAME)).toBeUndefined();
  });
});
