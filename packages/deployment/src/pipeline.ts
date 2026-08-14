import fs from "node:fs";
import path from "node:path";
import { getProject, transition, appendLog, projectDir } from "@hermes/projects";
import { scanForSecrets, type SecretFinding } from "@hermes/security";
import { buildProductionImage } from "./dockerBuild.js";
import { runContainer, stopContainer } from "./containers.js";
import { checkHealth } from "./healthCheck.js";
import { runSmokeTests } from "./smokeTest.js";
import { recordDeployment } from "./state.js";
import { rollback } from "./rollback.js";
import { findFreePort } from "./freePort.js";

export interface DeployOptions {
  port?: number;
  /** Defaults to <project>/.env.production if present, else .env. */
  envFile?: string;
}

export interface DeployResult {
  outcome: "DEPLOYED" | "FAILED_DEPLOYMENT";
  port: number;
  tag: string;
  url: string;
  rolledBack?: boolean;
  reason: string;
}

function resolveEnvFile(name: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const dir = projectDir(name);
  const prod = path.join(dir, ".env.production");
  if (fs.existsSync(prod)) return prod;
  const dev = path.join(dir, ".env");
  return fs.existsSync(dev) ? dev : undefined;
}

/**
 * READY_TO_DEPLOY -> DEPLOYING -> (health check + smoke test) ->
 * DEPLOYED, or FAILED_DEPLOYMENT with an automatic rollback attempt to the
 * last known-good image. See docs/deployment-strategy.md.
 *
 * This deploys to a container on this host only, reachable at
 * http://localhost:<port>/ — it never touches DNS, a reverse proxy, or a
 * real domain/SSL certificate. Publishing a project under a real domain is
 * a human-approved action per docs/security-model.md and is out of scope
 * for this function.
 */
export async function deployProject(name: string, options: DeployOptions = {}): Promise<DeployResult> {
  const manifest = getProject(name);
  if (manifest.status !== "READY_TO_DEPLOY") {
    throw new Error(
      `Project "${name}" is not READY_TO_DEPLOY (currently ${manifest.status}). Move it through REVIEW -> READY_TO_DEPLOY first.`,
    );
  }

  const port = options.port ?? (await findFreePort());
  const envFile = resolveEnvFile(name, options.envFile);
  const tag = String(Date.now());

  transition(name, "DEPLOYING", { reason: `deploying tag ${tag}`, actor: "deployment-pipeline" });
  appendLog(name, { event: "deployment_started", tag, port });

  try {
    const secretFindings = scanForSecrets(projectDir(name));
    if (secretFindings.length > 0) {
      appendLog(name, { event: "security_check_failed", tag, findings: secretFindings });
      throw new Error(
        `Security check failed: found ${secretFindings.length} potential secret(s) in generated code ` +
          `(${secretFindings.map((f: SecretFinding) => `${f.file}:${f.line} [${f.rule}] ${f.preview}`).join(", ")})`,
      );
    }
    appendLog(name, { event: "security_check_passed", tag });

    buildProductionImage(name, tag);
    appendLog(name, { event: "image_built", tag });

    stopContainer(name);
    runContainer(name, tag, port, envFile);
    appendLog(name, { event: "container_started", tag, port });

    const url = `http://localhost:${port}/`;
    const healthy = await checkHealth(url, 30_000);
    appendLog(name, { event: "health_check", tag, healthy });

    let smokePassed = false;
    let smokeOutput = "";
    if (healthy) {
      const smoke = runSmokeTests(name, url);
      smokePassed = smoke.passed;
      smokeOutput = smoke.output;
      appendLog(name, { event: "smoke_test", tag, passed: smoke.passed });
    }

    if (healthy && smokePassed) {
      recordDeployment(name, { tag, status: "success", port, timestamp: new Date().toISOString() });
      transition(name, "DEPLOYED", { reason: `tag ${tag} passed health check and smoke tests`, actor: "deployment-pipeline" });
      return { outcome: "DEPLOYED", port, tag, url, reason: "Health check and smoke tests passed" };
    }

    recordDeployment(name, { tag, status: "failed", port, timestamp: new Date().toISOString() });
    const rollbackResult = await rollback(name, port, envFile);
    appendLog(name, {
      event: "rollback",
      tag,
      rolledBack: rollbackResult.rolledBack,
      toTag: rollbackResult.toTag ?? null,
    });

    transition(name, "FAILED_DEPLOYMENT", {
      reason: !healthy ? "Health check failed" : "Smoke tests failed",
      actor: "deployment-pipeline",
    });

    return {
      outcome: "FAILED_DEPLOYMENT",
      port,
      tag,
      url,
      rolledBack: rollbackResult.rolledBack,
      reason: !healthy ? "Health check failed" : `Smoke tests failed:\n${smokeOutput.slice(0, 2000)}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendLog(name, { event: "deployment_error", tag, error: message });
    recordDeployment(name, { tag, status: "failed", port, timestamp: new Date().toISOString() });

    const rollbackResult = await rollback(name, port, envFile);
    appendLog(name, {
      event: "rollback",
      tag,
      rolledBack: rollbackResult.rolledBack,
      toTag: rollbackResult.toTag ?? null,
    });

    transition(name, "FAILED_DEPLOYMENT", {
      reason: `Deployment threw an error: ${message}`,
      actor: "deployment-pipeline",
    });

    throw err;
  }
}
