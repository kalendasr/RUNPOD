import { execFileSync } from "node:child_process";
import { imageTag } from "./dockerBuild.js";

export function containerName(name: string): string {
  return `hermes-${name}-prod`;
}

export function stopContainer(name: string): void {
  try {
    execFileSync("docker", ["rm", "-f", containerName(name)], { stdio: "pipe" });
  } catch {
    // no existing container — nothing to stop
  }
}

export function runContainer(name: string, tag: string, port: number, envFile?: string): void {
  const args = ["run", "-d", "--name", containerName(name), "-p", `${port}:3000`];
  if (envFile) args.push("--env-file", envFile);
  args.push(imageTag(name, tag));
  execFileSync("docker", args, { encoding: "utf8" });
}

export function isContainerRunning(name: string): boolean {
  try {
    const output = execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", containerName(name)], {
      encoding: "utf8",
    });
    return output.trim() === "true";
  } catch {
    return false;
  }
}
