import { assertProjectDoesNotExist, ensureProjectDirectories } from "./registry.js";
import { createManifest, writeManifest } from "./manifest.js";
import { appendLog } from "./logs.js";
import { writeTasksFile } from "./tasks.js";
import { startSandbox, isSandboxRunning } from "./sandbox.js";
import type { ProjectManifest, ProjectType } from "./types.js";

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  features?: string[];
  stack?: ProjectManifest["stack"];
}

export interface CreateProjectResult {
  manifest: ProjectManifest;
  sandboxRunning: boolean;
}

/**
 * Roadmap Phase 2 acceptance criteria:
 *   Create project -> Sandbox created -> Manifest created -> Docker environment starts
 */
export function createProject(input: CreateProjectInput): CreateProjectResult {
  assertProjectDoesNotExist(input.name);
  ensureProjectDirectories(input.name);

  const manifest = createManifest({
    name: input.name,
    type: input.type,
    features: input.features,
    stack: input.stack,
  });
  writeManifest(manifest);
  appendLog(input.name, { event: "project_created", to: manifest.status });

  writeTasksFile(input.name, manifest.features);

  startSandbox(manifest);
  const sandboxRunning = isSandboxRunning(input.name);
  appendLog(input.name, {
    event: "sandbox_started",
    sandboxRunning,
  });

  return { manifest, sandboxRunning };
}
