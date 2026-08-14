import fs from "node:fs";
import { PROJECTS_ROOT, projectDir } from "./paths.js";
import { manifestExists, readManifest } from "./manifest.js";
import type { ProjectManifest } from "./types.js";

export class ProjectExistsError extends Error {}
export class ProjectNotFoundError extends Error {}

export function projectExists(name: string): boolean {
  return manifestExists(name);
}

export function assertProjectDoesNotExist(name: string): void {
  if (projectExists(name)) {
    throw new ProjectExistsError(`Project "${name}" already exists`);
  }
}

export function getProject(name: string): ProjectManifest {
  if (!projectExists(name)) {
    throw new ProjectNotFoundError(`Project "${name}" is not registered`);
  }
  return readManifest(name);
}

export function listProjects(): ProjectManifest[] {
  if (!fs.existsSync(PROJECTS_ROOT)) return [];
  return fs
    .readdirSync(PROJECTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => manifestExists(name))
    .map((name) => readManifest(name));
}

export function ensureProjectDirectories(name: string): void {
  const dir = projectDir(name);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(`${dir}/logs`, { recursive: true });
  fs.mkdirSync(`${dir}/src`, { recursive: true });
}
