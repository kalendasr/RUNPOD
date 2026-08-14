import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
export const PROJECTS_ROOT = path.join(REPO_ROOT, "projects");
export const SAAS_TEMPLATE_DIR = path.join(REPO_ROOT, "templates", "saas");

export function projectDir(name: string): string {
  return path.join(PROJECTS_ROOT, name);
}
