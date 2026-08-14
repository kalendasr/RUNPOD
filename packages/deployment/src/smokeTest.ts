import { execFileSync } from "node:child_process";
import { projectDir } from "@hermes/projects";

export interface SmokeTestResult {
  passed: boolean;
  output: string;
}

/**
 * Runs the project's own Playwright suite against an already-running URL —
 * unlike packages/testing's browser-test step, this does not spawn its own
 * dev/start server; it points at the deployed production container.
 */
export function runSmokeTests(name: string, baseUrl: string): SmokeTestResult {
  try {
    const output = execFileSync("npx", ["playwright", "test"], {
      cwd: projectDir(name),
      encoding: "utf8",
      env: { ...process.env, HERMES_BASE_URL: baseUrl },
      maxBuffer: 1024 * 1024 * 20,
      timeout: 3 * 60 * 1000,
    });
    return { passed: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { passed: false, output: `${e.stdout ?? ""}\n${e.stderr ?? ""}` };
  }
}
