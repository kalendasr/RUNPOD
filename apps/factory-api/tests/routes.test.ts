import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import express from "express";
import request from "supertest";
import {
  createManifest,
  writeManifest,
  ensureProjectDirectories,
  writeTasksFile,
  appendLog,
  projectDir,
} from "@hermes/projects";
import { createRouter } from "../src/routes.js";

const TEST_NAME = "test-factory-api-project";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(createRouter());
  return app;
}

function seedProject() {
  ensureProjectDirectories(TEST_NAME);
  const manifest = createManifest({ name: TEST_NAME, type: "website", features: ["home", "contact"] });
  writeManifest(manifest);
  writeTasksFile(TEST_NAME, manifest.features);
  appendLog(TEST_NAME, { event: "build_step", attempt: 1, passed: true });
}

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("factory-api routes", () => {
  it("lists projects", async () => {
    seedProject();
    const res = await request(makeApp()).get("/projects");
    expect(res.status).toBe(200);
    expect(res.body.some((p: { name: string }) => p.name === TEST_NAME)).toBe(true);
  });

  it("404s for an unknown project", async () => {
    const res = await request(makeApp()).get("/projects/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns a project summary with tasks and test results", async () => {
    seedProject();
    const res = await request(makeApp()).get(`/projects/${TEST_NAME}`);
    expect(res.status).toBe(200);
    expect(res.body.taskProgress).toEqual({ done: 0, total: 2 });
    expect(res.body.latestTests).toEqual([
      expect.objectContaining({ step: "build", passed: true, attempt: 1 }),
    ]);
  });

  it("refuses to deploy without explicit approval", async () => {
    seedProject();
    const res = await request(makeApp()).post(`/projects/${TEST_NAME}/deploy`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approval/i);
  });
});
