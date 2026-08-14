import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { composePath, projectDir } from "./paths.js";
import type { ProjectManifest } from "./types.js";

// Every project gets an isolated Docker Compose project so its containers,
// network, and volumes never collide with another project's (see
// docs/security-model.md § Isolation).
function composeProjectName(name: string): string {
  return `hermes-${name}`;
}

function composeFileContents(manifest: ProjectManifest): string {
  // Minimal placeholder sandbox: proves the isolated Docker environment
  // starts. Project-type-specific services (Next.js, Postgres, etc.) are
  // added by the Builder agent in later phases once there is code to run.
  return `services:
  sandbox:
    image: node:22-alpine
    container_name: hermes-${manifest.name}-sandbox
    working_dir: /workspace
    volumes:
      - ./:/workspace
    command: >
      sh -c "echo 'Hermes sandbox for ${manifest.name} (${manifest.type}) is ready' && tail -f /dev/null"
    restart: unless-stopped
`;
}

function dockerCompose(name: string, args: string[]): string {
  return execFileSync(
    "docker",
    ["compose", "-p", composeProjectName(name), "-f", composePath(name), ...args],
    { cwd: projectDir(name), encoding: "utf8" },
  );
}

export function writeComposeFile(manifest: ProjectManifest): void {
  fs.writeFileSync(composePath(manifest.name), composeFileContents(manifest), "utf8");
}

export function startSandbox(manifest: ProjectManifest): void {
  writeComposeFile(manifest);
  dockerCompose(manifest.name, ["up", "-d"]);
}

export function stopSandbox(name: string): void {
  dockerCompose(name, ["down"]);
}

export function isSandboxRunning(name: string): boolean {
  let output: string;
  try {
    output = execFileSync(
      "docker",
      ["ps", "--filter", `label=com.docker.compose.project=${composeProjectName(name)}`, "--format", "{{.State}}"],
      { encoding: "utf8" },
    );
  } catch {
    return false;
  }
  const states = output.trim().split("\n").filter(Boolean);
  return states.length > 0 && states.every((state) => state === "running");
}
