import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { getProject, projectDir, stopSandbox } from "@hermes/projects";
import { runAutonomousPipeline } from "../src/pipeline.js";
import type { AIProvider, CompletionResult } from "@hermes/ai";

const PROJECT_NAME = "test-orchestrator-pipeline";

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function planningOnlyProvider(): AIProvider {
  // Only the planning call needs a scripted response — a website scaffold
  // from @hermes/website-factory builds and passes E2E tests cleanly with
  // no fix needed, so the AI Debugger should never be invoked in this test.
  return {
    name: "fake",
    model: "fake-model",
    isAvailable: vi.fn(async () => true),
    complete: vi.fn(async (): Promise<CompletionResult> => ({
      text: JSON.stringify({
        type: "website",
        projectName: PROJECT_NAME,
        siteName: "Alpha Red",
        siteDescription: "A modern landing page for Alpha Red.",
        pages: ["home", "contact"],
        requirements: "- Responsive landing page\n- Contact form",
        architecture: "- Next.js + Tailwind, static content only",
      }),
      provider: "fake",
      model: "fake-model",
      durationMs: 1,
    })),
  };
}

afterEach(() => {
  try {
    stopSandbox(PROJECT_NAME);
  } catch {
    // sandbox may not have started
  }
  fs.rmSync(projectDir(PROJECT_NAME), { recursive: true, force: true });
});

describe.skipIf(!dockerAvailable())("runAutonomousPipeline (integration, requires Docker)", () => {
  it("takes a brief all the way to READY_TO_DEPLOY via real build+test, with no AI fix needed", async () => {
    const provider = planningOnlyProvider();

    const result = await runAutonomousPipeline(provider, "Build me a landing page for Alpha Red with a contact page", {
      maxAttempts: 2,
    });

    expect(result.outcome).toBe("REVIEW");
    expect(result.readyToDeploy).toBe(true);
    expect(result.projectName).toBe(PROJECT_NAME);
    expect(getProject(PROJECT_NAME).status).toBe("READY_TO_DEPLOY");

    // Planner was called once; Debugger's complete() would show up as
    // additional calls if a fix had been attempted — a clean website
    // scaffold shouldn't need one.
    expect(provider.complete).toHaveBeenCalledTimes(1);

    const dir = projectDir(PROJECT_NAME);
    expect(fs.existsSync(`${dir}/requirements.md`)).toBe(true);
    expect(fs.existsSync(`${dir}/architecture.md`)).toBe(true);
  }, 5 * 60_000);
});
