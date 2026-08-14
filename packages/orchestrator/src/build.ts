import fs from "node:fs";
import path from "node:path";
import { createProject, projectDir, type ProjectManifest } from "@hermes/projects";
import { scaffoldWebsite, writePlaywrightTests } from "@hermes/website-factory";
import { scaffoldSaas, generateEntityCrud } from "@hermes/saas-factory";
import type { PlanResult } from "./plan.js";

export interface BuildResult {
  manifest: ProjectManifest;
  sandboxRunning: boolean;
}

function featureNamesFor(plan: PlanResult["plan"]): string[] {
  return plan.type === "website" ? plan.pages : plan.entities.map((e) => e.name);
}

/**
 * The factory's Builder (roadmap §10): every file this writes comes from
 * a deterministic generator (`@hermes/website-factory`/`@hermes/saas-factory`,
 * built in Phases 3-4), driven by the Planner's structured output — never
 * free-form AI-written source (roadmap §2 Core principle: the LLM reasons,
 * deterministic tools do file operations).
 */
export async function buildProject(planResult: PlanResult): Promise<BuildResult> {
  const { plan, requirements, architecture } = planResult;

  const result = createProject({
    name: plan.projectName,
    type: plan.type,
    features: featureNamesFor(plan),
  });

  const dir = projectDir(plan.projectName);
  fs.writeFileSync(path.join(dir, "requirements.md"), requirements, "utf8");
  fs.writeFileSync(path.join(dir, "architecture.md"), architecture, "utf8");

  if (plan.type === "website") {
    const spec = {
      projectName: plan.projectName,
      siteName: plan.siteName,
      siteDescription: plan.siteDescription,
      pages: plan.pages,
    };
    scaffoldWebsite(spec);
    writePlaywrightTests(spec);
  } else {
    scaffoldSaas({ projectName: plan.projectName, siteName: plan.siteName, siteDescription: plan.siteDescription });
    for (const entity of plan.entities) {
      generateEntityCrud(plan.projectName, entity);
    }
  }

  return result;
}
