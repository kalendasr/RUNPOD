import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createManifest, ensureProjectDirectories, getProject, projectDir, writeManifest } from "@hermes/projects";
import { readState } from "../src/state.js";

const buildProductionImage = vi.fn();

vi.mock("../src/dockerBuild.js", () => ({
  buildProductionImage: (...args: unknown[]) => buildProductionImage(...args),
  imageTag: (name: string, tag: string) => `hermes-${name}:${tag}`,
}));

const { deployProject } = await import("../src/pipeline.js");

const TEST_NAME = "test-deployment-pipeline-security-project";

function setUpReadyToDeployProjectWithSecret(): void {
  ensureProjectDirectories(TEST_NAME);
  const manifest = createManifest({ name: TEST_NAME, type: "website" });
  manifest.status = "READY_TO_DEPLOY";
  writeManifest(manifest);

  fs.writeFileSync(
    path.join(projectDir(TEST_NAME), "config.ts"),
    `const awsKey = "AKIAIOSFODNN7EXAMPLE";`,
    "utf8",
  );
}

afterEach(() => {
  vi.clearAllMocks();
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("deployProject security check", () => {
  it("fails the deployment and never builds the Docker image when a secret is found", async () => {
    setUpReadyToDeployProjectWithSecret();

    await expect(deployProject(TEST_NAME, { port: 4322 })).rejects.toThrow(/Security check failed/);

    expect(getProject(TEST_NAME).status).toBe("FAILED_DEPLOYMENT");
    expect(readState(TEST_NAME).deployments.at(-1)).toMatchObject({ status: "failed", port: 4322 });
    expect(buildProductionImage).not.toHaveBeenCalled();
  });
});
