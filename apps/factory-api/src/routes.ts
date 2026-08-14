import { Router } from "express";
import {
  listProjects,
  getProject,
  readLog,
  projectDir,
  ProjectNotFoundError,
  ProjectExistsError,
  ManifestValidationError,
  appendLog,
  createProject,
  type ProjectType,
} from "@hermes/projects";
import {
  deployProject,
  stopContainer,
  isContainerRunning,
  containerName,
} from "@hermes/deployment";
import { runCycle, NoOpFixStrategy, realStepsFor, realLifecycleFor } from "@hermes/testing";
import { podStatus, gpuConfigFromEnv, estimateGpuCost, readGpuSessions } from "@hermes/ai";
import { buildProjectSummary } from "./projectSummary.js";

const VALID_TYPES: ProjectType[] = ["website", "saas", "ecommerce", "ai-saas"];

const DEFAULT_GPU_HOURLY_RATE = 0.22;

export function createRouter(): Router {
  const router = Router();

  router.get("/projects", (_req, res) => {
    res.json(listProjects().map((m) => ({ name: m.name, type: m.type, status: m.status })));
  });

  router.post("/projects", (req, res) => {
    const { name, type, features } = req.body ?? {};

    if (typeof name !== "string" || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `Body must include a project "name" (string) and "type" (one of ${VALID_TYPES.join(", ")}).` });
      return;
    }

    try {
      const result = createProject({ name, type, features: Array.isArray(features) ? features : [] });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ProjectExistsError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (err instanceof ManifestValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get("/projects/:name", (req, res) => {
    try {
      res.json(buildProjectSummary(req.params.name));
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/projects/:name/logs", (req, res) => {
    try {
      getProject(req.params.name); // 404s if unknown
      res.json(readLog(req.params.name));
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // Human approval gate (docs/security-model.md § Human approval gates):
  // production deployment requires an explicit `approve: true` from a
  // human clicking the button — this endpoint never deploys on its own.
  router.post("/projects/:name/deploy", async (req, res) => {
    const name = req.params.name;
    const { approve, approvedBy, port } = req.body ?? {};

    if (approve !== true) {
      res.status(400).json({
        error: "Refusing to deploy without explicit approval. Set { approve: true } to confirm this is a human-approved production deployment.",
      });
      return;
    }

    try {
      getProject(name);
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }

    appendLog(name, {
      event: "deploy_approved",
      actor: approvedBy ?? "dashboard-user",
      reason: "Approved via control panel",
    });

    try {
      const result = await deployProject(name, { port });
      res.json(result);
    } catch (err) {
      appendLog(name, { event: "deploy_error", reason: (err as Error).message });
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Drives the bounded BUILD -> TEST -> FIX loop (docs/project-lifecycle.md,
  // roadmap §15). No AI-driven fix strategy is wired in yet (see
  // packages/testing/src/fixStrategy.ts) — a failing build/test just
  // escalates to FAILED_BUILD/FAILED_TESTS rather than retrying blindly.
  router.post("/projects/:name/test", async (req, res) => {
    const name = req.params.name;
    try {
      const manifest = getProject(name);
      const steps = realStepsFor(manifest, projectDir(name));
      const lifecycle = realLifecycleFor(name);
      const maxAttempts = Number(req.body?.maxAttempts ?? 5);
      const result = await runCycle(steps, lifecycle, new NoOpFixStrategy(), { maxAttempts });
      res.json(result);
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post("/projects/:name/stop", (req, res) => {
    const name = req.params.name;
    try {
      getProject(name);
    } catch (err) {
      if (err instanceof ProjectNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }

    const wasRunning = isContainerRunning(name);
    stopContainer(name);
    appendLog(name, { event: "container_stopped", actor: req.body?.actor ?? "api" });
    res.json({ container: containerName(name), wasRunning, running: isContainerRunning(name) });
  });

  router.get("/gpu/status", async (_req, res) => {
    try {
      const status = await podStatus(gpuConfigFromEnv());
      res.json({ status });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  router.get("/costs/gpu", (_req, res) => {
    const rate = Number(process.env.HERMES_AI_GPU_HOURLY_RATE ?? DEFAULT_GPU_HOURLY_RATE);
    res.json({ ...estimateGpuCost(rate), sessions: readGpuSessions() });
  });

  return router;
}
