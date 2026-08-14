import { Router } from "express";
import { listProjects, getProject, readLog, ProjectNotFoundError, appendLog } from "@hermes/projects";
import { deployProject } from "@hermes/deployment";
import { podStatus, gpuConfigFromEnv, estimateGpuCost, readGpuSessions } from "@hermes/ai";
import { buildProjectSummary } from "./projectSummary.js";

const DEFAULT_GPU_HOURLY_RATE = 0.22;

export function createRouter(): Router {
  const router = Router();

  router.get("/projects", (_req, res) => {
    res.json(listProjects().map((m) => ({ name: m.name, type: m.type, status: m.status })));
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
