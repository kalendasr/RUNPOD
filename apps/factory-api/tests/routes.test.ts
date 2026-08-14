import { afterEach, describe, expect, it, vi } from "vitest";
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
  transition,
} from "@hermes/projects";

// Route-level test: exercises the /test endpoint's wiring, not runCycle's
// internals (already covered by packages/testing's own tests) — a real
// cycle would shell out to npm install/build against a project with no
// app scaffolding, which is slow and belongs at the package level.
vi.mock("@hermes/testing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hermes/testing")>();
  return {
    ...actual,
    runCycle: vi.fn(async () => ({ outcome: "FAILED_BUILD", attempts: 1, reason: "stubbed for route test" })),
  };
});

// Same reasoning as the @hermes/testing mock above: a real run shells out
// to an AI provider plus npm/Docker — this only asserts the route's own
// wiring (body validation, status codes, error mapping).
vi.mock("@hermes/orchestrator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hermes/orchestrator")>();
  return { ...actual, runAutonomousPipeline: vi.fn() };
});

// createProject wraps a real sandbox start (Docker) — kept real by default
// (spyOn, not a full mock) so every other test exercises the real function;
// one test below overrides it once to assert routes.ts's error handling
// without depending on whether Docker happens to be available in whatever
// environment the suite runs in.
const projectsModule = await import("@hermes/projects");
const createProjectSpy = vi.spyOn(projectsModule, "createProject");

const { createRouter } = await import("../src/routes.js");
const { runAutonomousPipeline } = await import("@hermes/orchestrator");

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

  it("rejects project creation with a missing/invalid type", async () => {
    const res = await request(makeApp()).post("/projects").send({ name: "whatever" });
    expect(res.status).toBe(400);
  });

  it("returns a clean JSON error (not a stack trace) when project creation throws unexpectedly", async () => {
    // Forces the failure deterministically (e.g. Docker being unavailable
    // would normally trigger this) rather than depending on whether Docker
    // happens to be reachable in whatever environment the suite runs in.
    // This asserts the route never lets an unexpected throw leak as an
    // unhandled 500 HTML page.
    createProjectSpy.mockImplementationOnce(() => {
      throw new Error("sandbox failed to start");
    });

    const res = await request(makeApp())
      .post("/projects")
      .send({ name: "test-factory-api-create-project-throws", type: "website" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "sandbox failed to start" });
  });

  it("runs the test cycle and returns its outcome", async () => {
    seedProject();
    transition(TEST_NAME, "PLANNING", { reason: "test", actor: "test" });
    transition(TEST_NAME, "APPROVED", { reason: "test", actor: "test" });
    const res = await request(makeApp()).post(`/projects/${TEST_NAME}/test`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ outcome: "FAILED_BUILD" });
  });

  it("stops a project's container even when none is running", async () => {
    seedProject();
    const res = await request(makeApp()).post(`/projects/${TEST_NAME}/stop`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ wasRunning: false, running: false });
  });

  it("rejects an autonomous run with a missing brief", async () => {
    const res = await request(makeApp()).post("/projects/autonomous").send({});
    expect(res.status).toBe(400);
  });

  it("runs the autonomous pipeline and returns its result", async () => {
    vi.mocked(runAutonomousPipeline).mockResolvedValueOnce({
      projectName: "alpha-red",
      plan: { type: "website", projectName: "alpha-red", siteName: "Alpha Red", siteDescription: "d", pages: ["home"] },
      outcome: "REVIEW",
      attempts: 1,
      reason: "All tests passed",
      readyToDeploy: true,
    });

    const res = await request(makeApp()).post("/projects/autonomous").send({ brief: "Build me a landing page" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ projectName: "alpha-red", outcome: "REVIEW", readyToDeploy: true });
  });

  it("returns 422 when the AI planner fails to produce a usable plan", async () => {
    const { PlanningFailedError } = await import("@hermes/orchestrator");
    vi.mocked(runAutonomousPipeline).mockRejectedValueOnce(new PlanningFailedError("no JSON object found"));

    const res = await request(makeApp()).post("/projects/autonomous").send({ brief: "asdf" });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("no JSON object found");
  });
});
