import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as websiteFactory from "@hermes/website-factory";
import * as saasFactory from "@hermes/saas-factory";
import type { ProjectManifest } from "@hermes/projects";
import type { StepResult, TestSteps } from "./types.js";

function toStepResult(fn: () => { command: string; output: string }): StepResult {
  try {
    const result = fn();
    return { passed: true, output: result.output };
  } catch (err) {
    return { passed: false, output: err instanceof Error ? err.message : String(err) };
  }
}

function hasUnitTestScript(projectDir: string): boolean {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return typeof pkg.scripts?.["test:unit"] === "string";
}

function runUnitTestScript(name: string, projectDir: string): StepResult {
  if (!hasUnitTestScript(projectDir)) {
    return { passed: true, skipped: true, output: "No test:unit script defined; skipping unit tests." };
  }
  try {
    const output = execFileSync("npm", ["run", "test:unit"], {
      cwd: projectDir,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
      timeout: 2 * 60 * 1000,
    });
    return { passed: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return { passed: false, output: `${e.stdout ?? ""}\n${e.stderr ?? e.message}` };
  }
}

/** Builds the real (Docker/npm/Postgres-touching) TestSteps for a project, based on its manifest type. */
export function realStepsFor(manifest: ProjectManifest, projectDir: string): TestSteps {
  if (manifest.type === "website") {
    return {
      runBuild: async () =>
        toStepResult(() => {
          websiteFactory.npmInstall(manifest.name);
          return websiteFactory.npmBuild(manifest.name);
        }),
      runUnitTests: async () => runUnitTestScript(manifest.name, projectDir),
      runBrowserTests: async () => websiteFactory.runE2ETests(manifest.name),
    };
  }

  // saas, ecommerce, ai-saas all currently share the SaaS template/toolchain.
  return {
    runBuild: async () =>
      toStepResult(() => {
        saasFactory.npmInstall(manifest.name);
        saasFactory.prismaGenerate(manifest.name);
        saasFactory.prismaMigrate(manifest.name);
        return saasFactory.npmBuild(manifest.name);
      }),
    runUnitTests: async () => runUnitTestScript(manifest.name, projectDir),
    runBrowserTests: async () => saasFactory.runE2ETests(manifest.name),
  };
}
