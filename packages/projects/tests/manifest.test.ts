import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { createManifest, writeManifest, readManifest, ManifestValidationError } from "../src/manifest.js";
import { projectDir } from "../src/paths.js";

const TEST_NAME = "test-manifest-project";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("manifest", () => {
  it("creates a valid DRAFT manifest with defaults", () => {
    const manifest = createManifest({ name: TEST_NAME, type: "website" });
    expect(manifest.status).toBe("DRAFT");
    expect(manifest.deployment.provider).toBe("docker");
    expect(manifest.testing.unit).toBe(true);
  });

  it("round-trips through disk as YAML", () => {
    const manifest = createManifest({ name: TEST_NAME, type: "saas", features: ["auth", "billing"] });
    writeManifest(manifest);
    const reloaded = readManifest(TEST_NAME);
    expect(reloaded).toEqual(manifest);
  });

  it("rejects an invalid project name", () => {
    expect(() => createManifest({ name: "Not Valid!", type: "website" })).toThrow(ManifestValidationError);
  });

  it("rejects an invalid project type", () => {
    // @ts-expect-error deliberately invalid
    expect(() => createManifest({ name: TEST_NAME, type: "mobile" })).toThrow(ManifestValidationError);
  });
});
