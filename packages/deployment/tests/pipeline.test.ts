import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createManifest, ensureProjectDirectories, getProject, projectDir, writeManifest } from "@hermes/projects";
import { readState } from "../src/state.js";

vi.mock("../src/dockerBuild.js", () => ({
  buildProductionImage: vi.fn(() => {
    throw new Error("docker build failed: no such file or directory (Dockerfile)");
  }),
  imageTag: (name: string, tag: string) => `hermes-${name}:${tag}`,
}));

const { deployProject } = await import("../src/pipeline.js");

const TEST_NAME = "test-deployment-pipeline-project";

function setUpReadyToDeployProject(): void {
  ensureProjectDirectories(TEST_NAME);
  const manifest = createManifest({ name: TEST_NAME, type: "website" });
  manifest.status = "READY_TO_DEPLOY";
  writeManifest(manifest);
}

afterEach(() => {
  vi.clearAllMocks();
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("deployProject", () => {
  it("moves the project to FAILED_DEPLOYMENT instead of leaving it stuck in DEPLOYING when the image build throws", async () => {
    setUpReadyToDeployProject();

    await expect(deployProject(TEST_NAME, { port: 4321 })).rejects.toThrow(/docker build failed/);

    expect(getProject(TEST_NAME).status).toBe("FAILED_DEPLOYMENT");
    expect(readState(TEST_NAME).deployments.at(-1)).toMatchObject({ status: "failed", port: 4321 });
  });
});
