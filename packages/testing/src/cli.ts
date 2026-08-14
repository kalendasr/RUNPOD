#!/usr/bin/env node
import { Command } from "commander";
import { getProject, projectDir } from "@hermes/projects";
import { runCycle } from "./cycle.js";
import { NoOpFixStrategy } from "./fixStrategy.js";
import { realStepsFor } from "./realSteps.js";
import { realLifecycleFor } from "./realLifecycle.js";

const program = new Command();
program.name("hermes-test").description("Hermes Digital Factory autonomous BUILD -> TEST -> FIX cycle");

program
  .command("run")
  .argument("<name>", "project name")
  .option("--max-attempts <n>", "maximum_attempts before giving up (roadmap section 15)", "5")
  .action(async (name: string, opts: { maxAttempts: string }) => {
    const manifest = getProject(name);
    const steps = realStepsFor(manifest, projectDir(name));
    const lifecycle = realLifecycleFor(name);
    const result = await runCycle(steps, lifecycle, new NoOpFixStrategy(), {
      maxAttempts: Number(opts.maxAttempts),
    });

    console.log(`\nOutcome: ${result.outcome} after ${result.attempts} attempt(s)`);
    console.log(result.reason);
    process.exitCode = result.outcome === "REVIEW" ? 0 : 1;
  });

program.parseAsync(process.argv);
