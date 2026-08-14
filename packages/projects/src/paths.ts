import { fileURLToPath } from "node:url";
import path from "node:path";

// packages/projects/src/paths.ts -> repo root is four levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
export const PROJECTS_ROOT = path.join(REPO_ROOT, "projects");

export function projectDir(name: string): string {
  return path.join(PROJECTS_ROOT, name);
}

export function manifestPath(name: string): string {
  return path.join(projectDir(name), "hermes.yaml");
}

export function logPath(name: string): string {
  return path.join(projectDir(name), "logs", "project.log");
}

export function tasksPath(name: string): string {
  return path.join(projectDir(name), "tasks.md");
}

export function composePath(name: string): string {
  return path.join(projectDir(name), "docker-compose.yml");
}
