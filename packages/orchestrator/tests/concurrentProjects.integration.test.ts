import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { getProject, projectDir, stopSandbox } from "@hermes/projects";
import { runAutonomousPipeline } from "../src/pipeline.js";
import type { AIProvider, CompletionResult } from "@hermes/ai";

const NAME_A = "test-orchestrator-concurrent-a";
const NAME_B = "test-orchestrator-concurrent-b";

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function providerFor(projectName: string, pages: string[]): AIProvider {
  return {
    name: "fake",
    model: "fake-model",
    isAvailable: vi.fn(async () => true),
    complete: vi.fn(async (): Promise<CompletionResult> => ({
      text: JSON.stringify({
        type: "website",
        projectName,
        siteName: projectName,
        siteDescription: `Site for ${projectName}`,
        pages,
        requirements: `- Requirements for ${projectName}`,
        architecture: `- Architecture for ${projectName}`,
      }),
      provider: "fake",
      model: "fake-model",
      durationMs: 1,
    })),
  };
}

function cleanup(name: string): void {
  try {
    stopSandbox(name);
  } catch {
    // sandbox may not have started
  }
  fs.rmSync(projectDir(name), { recursive: true, force: true });
}

afterEach(() => {
  cleanup(NAME_A);
  cleanup(NAME_B);
});

describe.skipIf(!dockerAvailable())("running multiple projects independently (integration, requires Docker)", () => {
  it("runs two autonomous pipelines concurrently with no cross-contamination", async () => {
    const [resultA, resultB] = await Promise.all([
      runAutonomousPipeline(providerFor(NAME_A, ["home", "about"]), "brief A", { maxAttempts: 2 }),
      runAutonomousPipeline(providerFor(NAME_B, ["home", "contact"]), "brief B", { maxAttempts: 2 }),
    ]);

    expect(resultA.outcome).toBe("REVIEW");
    expect(resultB.outcome).toBe("REVIEW");
    expect(resultA.projectName).toBe(NAME_A);
    expect(resultB.projectName).toBe(NAME_B);

    // Each project's own manifest/pages reflect only its own plan — proves
    // no shared mutable state leaked between the two concurrent runs.
    expect(getProject(NAME_A).status).toBe("READY_TO_DEPLOY");
    expect(getProject(NAME_B).status).toBe("READY_TO_DEPLOY");
    expect(getProject(NAME_A).features).toEqual(["home", "about"]);
    expect(getProject(NAME_B).features).toEqual(["home", "contact"]);

    expect(fs.existsSync(`${projectDir(NAME_A)}/app/about/page.tsx`)).toBe(true);
    expect(fs.existsSync(`${projectDir(NAME_A)}/app/contact/page.tsx`)).toBe(false);
    expect(fs.existsSync(`${projectDir(NAME_B)}/app/contact/page.tsx`)).toBe(true);
    expect(fs.existsSync(`${projectDir(NAME_B)}/app/about/page.tsx`)).toBe(false);
  }, 5 * 60_000);
});
