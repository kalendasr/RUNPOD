#!/usr/bin/env node
import { Command } from "commander";
import { scaffoldWebsite } from "./scaffold.js";
import { writePlaywrightTests } from "./playwrightTests.js";
import { npmInstall, npmBuild } from "./build.js";
import { runE2ETests } from "./e2e.js";
import { ALL_PAGE_KINDS, type PageKind } from "./types.js";

const program = new Command();
program.name("hermes-website").description("Hermes Digital Factory website generator");

function parsePages(raw: string | undefined): PageKind[] {
  if (!raw) return ["home", "about", "services", "projects", "contact"];
  const kinds = raw.split(",").map((s) => s.trim().toLowerCase()) as PageKind[];
  const invalid = kinds.filter((k) => !ALL_PAGE_KINDS.includes(k));
  if (invalid.length > 0) {
    throw new Error(`Unknown page kind(s): ${invalid.join(", ")}. Valid: ${ALL_PAGE_KINDS.join(", ")}`);
  }
  return kinds;
}

program
  .command("generate")
  .argument("<name>", "project name (must already exist via hermes-project create)")
  .requiredOption("-s, --site-name <siteName>", "human-readable site name")
  .option("-d, --description <description>", "one-line site description", "A site built by the Hermes Digital Factory.")
  .option("-p, --pages <pages>", "comma-separated: home,about,services,projects,contact")
  .action((name: string, opts: { siteName: string; description: string; pages?: string }) => {
    const pages = parsePages(opts.pages);
    const spec = { projectName: name, siteName: opts.siteName, siteDescription: opts.description, pages };
    scaffoldWebsite(spec);
    writePlaywrightTests(spec);
    console.log(`Website generated for "${name}" with pages: ${pages.join(", ")}`);
  });

program
  .command("build")
  .argument("<name>")
  .action((name: string) => {
    console.log("Installing dependencies...");
    npmInstall(name);
    console.log("Running production build...");
    const result = npmBuild(name);
    console.log(result.output);
    console.log("Build succeeded.");
  });

program
  .command("test")
  .argument("<name>")
  .option("--port <port>", "port to serve the built site on (default: an automatically chosen free port)")
  .action(async (name: string, opts: { port?: string }) => {
    const result = await runE2ETests(name, opts.port ? Number(opts.port) : undefined);
    console.log(result.output);
    if (!result.passed) {
      console.error("E2E tests failed.");
      process.exitCode = 1;
    } else {
      console.log("E2E tests passed.");
    }
  });

program.parseAsync(process.argv);
