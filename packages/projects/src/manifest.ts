import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { manifestPath } from "./paths.js";
import type { ProjectManifest, ProjectType } from "./types.js";

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const VALID_TYPES: ProjectType[] = ["website", "saas", "ecommerce", "ai-saas"];

export class ManifestValidationError extends Error {}

export function validateManifest(manifest: ProjectManifest): void {
  if (!NAME_PATTERN.test(manifest.name)) {
    throw new ManifestValidationError(
      `Invalid project name "${manifest.name}": must be lowercase kebab-case`,
    );
  }
  if (!VALID_TYPES.includes(manifest.type)) {
    throw new ManifestValidationError(`Invalid project type "${manifest.type}"`);
  }
  if (!manifest.status) {
    throw new ManifestValidationError("Manifest is missing status");
  }
  if (!Array.isArray(manifest.features)) {
    throw new ManifestValidationError("Manifest features must be an array");
  }
  if (!manifest.deployment?.provider) {
    throw new ManifestValidationError("Manifest is missing deployment.provider");
  }
  const testing = manifest.testing;
  if (
    typeof testing?.unit !== "boolean" ||
    typeof testing?.integration !== "boolean" ||
    typeof testing?.browser !== "boolean"
  ) {
    throw new ManifestValidationError("Manifest testing flags must be booleans");
  }
}

export function createManifest(input: {
  name: string;
  type: ProjectType;
  features?: string[];
  stack?: ProjectManifest["stack"];
  deploymentProvider?: string;
  testing?: Partial<ProjectManifest["testing"]>;
}): ProjectManifest {
  const manifest: ProjectManifest = {
    name: input.name,
    type: input.type,
    status: "DRAFT",
    stack: input.stack ?? {},
    features: input.features ?? [],
    deployment: { provider: input.deploymentProvider ?? "docker" },
    testing: {
      unit: input.testing?.unit ?? true,
      integration: input.testing?.integration ?? true,
      browser: input.testing?.browser ?? false,
    },
  };
  validateManifest(manifest);
  return manifest;
}

export function writeManifest(manifest: ProjectManifest): void {
  validateManifest(manifest);
  const filePath = manifestPath(manifest.name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, yaml.dump(manifest, { sortKeys: false }), "utf8");
}

export function readManifest(name: string): ProjectManifest {
  const filePath = manifestPath(name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No manifest found for project "${name}" at ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const manifest = yaml.load(raw) as ProjectManifest;
  validateManifest(manifest);
  return manifest;
}

export function manifestExists(name: string): boolean {
  return fs.existsSync(manifestPath(name));
}
