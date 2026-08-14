#!/usr/bin/env node
import { Command } from "commander";
import { createProject } from "./createProject.js";
import { listProjects, getProject } from "./registry.js";
import { transition } from "./lifecycle.js";
import { readLog } from "./logs.js";
import { taskProgress } from "./tasks.js";
import { isSandboxRunning } from "./sandbox.js";
import type { ProjectStatus, ProjectType } from "./types.js";

const program = new Command();
program.name("hermes-project").description("Hermes Digital Factory project engine CLI");

program
  .command("create")
  .argument("<name>", "project name (kebab-case)")
  .requiredOption("-t, --type <type>", "website | saas | ecommerce | ai-saas")
  .option("-f, --feature <feature...>", "feature to include (repeatable)")
  .action((name: string, opts: { type: ProjectType; feature?: string[] }) => {
    const result = createProject({ name, type: opts.type, features: opts.feature ?? [] });
    console.log(`Project created: ${result.manifest.name} (${result.manifest.status})`);
    console.log(`Sandbox running: ${result.sandboxRunning}`);
  });

program
  .command("list")
  .action(() => {
    for (const manifest of listProjects()) {
      const progress = taskProgress(manifest.name);
      console.log(`${manifest.name}\t${manifest.status}\t${manifest.type}\t${progress.done}/${progress.total} tasks`);
    }
  });

program
  .command("status")
  .argument("<name>")
  .action((name: string) => {
    const manifest = getProject(name);
    const progress = taskProgress(name);
    console.log(`name:    ${manifest.name}`);
    console.log(`type:    ${manifest.type}`);
    console.log(`status:  ${manifest.status}`);
    console.log(`tasks:   ${progress.done}/${progress.total}`);
    console.log(`sandbox: ${isSandboxRunning(name) ? "running" : "stopped"}`);
  });

program
  .command("transition")
  .argument("<name>")
  .argument("<status>")
  .requiredOption("-r, --reason <reason>")
  .option("-a, --actor <actor>", "who/what triggered this", "cli")
  .action((name: string, status: ProjectStatus, opts: { reason: string; actor: string }) => {
    const to = transition(name, status, { reason: opts.reason, actor: opts.actor });
    console.log(`${name} -> ${to}`);
  });

program
  .command("logs")
  .argument("<name>")
  .action((name: string) => {
    for (const entry of readLog(name)) {
      console.log(JSON.stringify(entry));
    }
  });

program.parseAsync(process.argv);
