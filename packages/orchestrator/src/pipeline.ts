import type { AIProvider } from "@hermes/ai";
import { transition, appendLog, projectDir } from "@hermes/projects";
import { runCycle, realStepsFor, realLifecycleFor } from "@hermes/testing";
import { planProject, type ProjectPlan } from "./plan.js";
import { buildProject } from "./build.js";
import { AIFixStrategy } from "./fixStrategy.js";

export interface PipelineOptions {
  maxAttempts?: number;
}

export interface PipelineResult {
  projectName: string;
  plan: ProjectPlan;
  outcome: "REVIEW" | "FAILED_BUILD" | "FAILED_TESTS";
  attempts: number;
  reason: string;
  /** true only when the outcome is REVIEW and the project reached READY_TO_DEPLOY. */
  readyToDeploy: boolean;
}

const ACTOR = "orchestrator";

/**
 * The full autonomous pipeline (roadmap §11):
 * IDEA -> PLANNER -> BUILDER -> TESTER -> DEBUGGER -> (stops here).
 *
 * Deliberately does NOT continue into SECURITY REVIEW / DEPLOYMENT /
 * PRODUCTION — those already require human approval
 * (`docs/security-model.md` § Human approval gates), enforced the same
 * way for every other entry point (dashboard, Telegram, CLI): this
 * function prepares a project up to READY_TO_DEPLOY and stops. A human
 * (or another explicit, approval-gated call) takes it from there.
 */
export async function runAutonomousPipeline(
  provider: AIProvider,
  brief: string,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const planResult = await planProject(provider, brief);
  const { plan } = planResult;

  const buildResult = await buildProject(planResult);
  appendLog(plan.projectName, { event: "autonomous_pipeline_started", actor: ACTOR, brief });

  transition(plan.projectName, "PLANNING", { reason: "Autonomous pipeline: plan produced", actor: ACTOR });
  transition(plan.projectName, "APPROVED", { reason: "Autonomous pipeline: scaffold generated", actor: ACTOR });

  const steps = realStepsFor(buildResult.manifest, projectDir(plan.projectName));
  const lifecycle = realLifecycleFor(plan.projectName);
  const fixStrategy = new AIFixStrategy(provider, plan.projectName);

  const cycleResult = await runCycle(steps, lifecycle, fixStrategy, { maxAttempts: options.maxAttempts ?? 5 });

  let readyToDeploy = false;
  if (cycleResult.outcome === "REVIEW") {
    transition(plan.projectName, "READY_TO_DEPLOY", {
      reason: "Autonomous pipeline reached REVIEW; awaiting human approval to deploy",
      actor: ACTOR,
    });
    readyToDeploy = true;
  }

  appendLog(plan.projectName, {
    event: "autonomous_pipeline_finished",
    actor: ACTOR,
    outcome: cycleResult.outcome,
    attempts: cycleResult.attempts,
    readyToDeploy,
  });

  return {
    projectName: plan.projectName,
    plan,
    outcome: cycleResult.outcome,
    attempts: cycleResult.attempts,
    reason: cycleResult.reason,
    readyToDeploy,
  };
}
