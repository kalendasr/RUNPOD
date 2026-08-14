#!/usr/bin/env node
import { Command } from "commander";
import { providerFromEnv } from "@hermes/ai";
import { planProject } from "./plan.js";
import { runAutonomousPipeline } from "./pipeline.js";

const program = new Command();
program.name("hermes-orchestrator").description("Hermes Digital Factory autonomous pipeline: brief -> plan -> build -> test -> fix");

program
  .command("plan")
  .argument("<brief>", "natural-language project brief")
  .action(async (brief: string) => {
    const result = await planProject(providerFromEnv(), brief);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("run")
  .argument("<brief>", "natural-language project brief")
  .option("--max-attempts <n>", "maximum_attempts before giving up (roadmap section 15)", "5")
  .action(async (brief: string, opts: { maxAttempts: string }) => {
    const result = await runAutonomousPipeline(providerFromEnv(), brief, { maxAttempts: Number(opts.maxAttempts) });
    console.log(`\nProject: ${result.projectName} (${result.plan.type})`);
    console.log(`Outcome: ${result.outcome} after ${result.attempts} attempt(s)`);
    console.log(result.reason);
    if (result.readyToDeploy) {
      console.log(`\nREADY_TO_DEPLOY. Deploy requires explicit human approval:`);
      console.log(`  npx hermes-deploy run ${result.projectName} --yes`);
    }
    process.exitCode = result.outcome === "REVIEW" ? 0 : 1;
  });

program.parseAsync(process.argv);
