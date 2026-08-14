import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { createProject } from "../src/createProject.js";
import { stopSandbox } from "../src/sandbox.js";
import { projectDir } from "../src/paths.js";

const TEST_NAME = "test-integration-project";

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

afterEach(() => {
  try {
    stopSandbox(TEST_NAME);
  } catch {
    // sandbox may not have started; nothing to clean up
  }
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe.skipIf(!dockerAvailable())("createProject (integration, requires Docker)", () => {
  it("creates a project with a real running sandbox container", () => {
    const result = createProject({
      name: TEST_NAME,
      type: "website",
      features: ["home-page", "contact-form"],
    });

    expect(result.manifest.status).toBe("DRAFT");
    expect(result.sandboxRunning).toBe(true);
    expect(fs.existsSync(`${projectDir(TEST_NAME)}/hermes.yaml`)).toBe(true);
    expect(fs.existsSync(`${projectDir(TEST_NAME)}/docker-compose.yml`)).toBe(true);
    expect(fs.existsSync(`${projectDir(TEST_NAME)}/tasks.md`)).toBe(true);

    const running = execSync(
      `docker ps --filter "label=com.docker.compose.project=hermes-${TEST_NAME}" --format '{{.Names}}'`,
      { encoding: "utf8" },
    ).trim();
    expect(running).toBe(`hermes-${TEST_NAME}-sandbox`);
  }, 30_000);
});
