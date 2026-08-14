import { fileURLToPath } from "node:url";
import path from "node:path";

// packages/website-factory/src/paths.ts -> repo root is three levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
export const PROJECTS_ROOT = path.join(REPO_ROOT, "projects");
export const WEBSITE_TEMPLATE_DIR = path.join(REPO_ROOT, "templates", "website");

export function projectDir(name: string): string {
  return path.join(PROJECTS_ROOT, name);
}
