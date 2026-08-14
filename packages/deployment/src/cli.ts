#!/usr/bin/env node
import { Command } from "commander";
import { deployProject } from "./pipeline.js";
import { readState } from "./state.js";
import { rollback } from "./rollback.js";
import { containerName, isContainerRunning } from "./containers.js";

const program = new Command();
program.name("hermes-deploy").description("Hermes Digital Factory deployment pipeline");

program
  .command("run")
  .argument("<name>", "project name (must be READY_TO_DEPLOY)")
  .option("--yes", "confirm this is a human-approved production deployment (see docs/security-model.md)")
  .option("--port <port>", "host port to deploy to (default: an automatically chosen free port)")
  .action(async (name: string, opts: { yes?: boolean; port?: string }) => {
    if (!opts.yes) {
      console.error(
        "Refusing to deploy without --yes. Production deployment requires explicit human approval " +
          "(see docs/security-model.md § Human approval gates).",
      );
      process.exitCode = 1;
      return;
    }

    const result = await deployProject(name, { port: opts.port ? Number(opts.port) : undefined });
    console.log(`\nOutcome: ${result.outcome}`);
    console.log(`URL: ${result.url}`);
    console.log(`Tag: ${result.tag}`);
    if (result.rolledBack !== undefined) console.log(`Rolled back: ${result.rolledBack}`);
    console.log(result.reason);
    process.exitCode = result.outcome === "DEPLOYED" ? 0 : 1;
  });

program
  .command("status")
  .argument("<name>")
  .action((name: string) => {
    console.log(`container:  ${containerName(name)}`);
    console.log(`running:    ${isContainerRunning(name)}`);
    console.log("history:");
    for (const d of readState(name).deployments) {
      console.log(`  ${d.timestamp}  tag=${d.tag}  status=${d.status}  port=${d.port}`);
    }
  });

program
  .command("rollback")
  .argument("<name>")
  .requiredOption("--port <port>", "port the container should be running on")
  .action(async (name: string, opts: { port: string }) => {
    const result = await rollback(name, Number(opts.port));
    if (!result.rolledBack) {
      console.error("Rollback failed: no previous successful deployment to roll back to, or the rollback container failed its health check.");
      process.exitCode = 1;
      return;
    }
    console.log(`Rolled back to tag ${result.toTag}`);
  });

program.parseAsync(process.argv);
