import { execFileSync } from "node:child_process";
import { projectDir } from "@hermes/projects";

export function imageTag(name: string, tag: string): string {
  return `hermes-${name}:${tag}`;
}

export function buildProductionImage(name: string, tag: string): { output: string } {
  const output = execFileSync("docker", ["build", "-t", imageTag(name, tag), "."], {
    cwd: projectDir(name),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
    timeout: 5 * 60 * 1000,
  });
  return { output };
}

export function imageExists(name: string, tag: string): boolean {
  try {
    execFileSync("docker", ["image", "inspect", imageTag(name, tag)], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
