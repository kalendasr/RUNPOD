#!/usr/bin/env node
import { Command } from "commander";
import { scaffoldSaas } from "./scaffold.js";
import { generateEntityCrud } from "./crud.js";
import { npmInstall, prismaMigrate, prismaGenerate, npmBuild } from "./build.js";
import { writeEnvFile } from "./env.js";
import type { EntitySpec } from "./types.js";

const program = new Command();
program.name("hermes-saas").description("Hermes Digital Factory SaaS generator");

function parseEntity(raw: string): EntitySpec {
  const [name, fieldsRaw] = raw.split(":");
  if (!name || !fieldsRaw) {
    throw new Error(`Invalid --entity "${raw}". Expected format: Name:field1,field2`);
  }
  return { name, fields: fieldsRaw.split(",").map((f) => f.trim()).filter(Boolean) };
}

program
  .command("generate")
  .argument("<name>", "project name (must already exist via hermes-project create)")
  .requiredOption("-s, --site-name <siteName>", "human-readable app name")
  .option("-d, --description <description>", "one-line app description", "A SaaS app built by the Hermes Digital Factory.")
  .action((name: string, opts: { siteName: string; description: string }) => {
    scaffoldSaas({ projectName: name, siteName: opts.siteName, siteDescription: opts.description });
    console.log(`SaaS scaffold generated for "${name}".`);
  });

program
  .command("add-entity")
  .argument("<name>")
  .requiredOption("-e, --entity <entity>", "Name:field1,field2")
  .action((name: string, opts: { entity: string }) => {
    const entity = parseEntity(opts.entity);
    generateEntityCrud(name, entity);
    console.log(`Entity "${entity.name}" added: API at /api/${entity.name.toLowerCase()}s, dashboard page at /dashboard/${entity.name.toLowerCase()}s`);
  });

program
  .command("init-env")
  .argument("<name>")
  .requiredOption("--database-url <url>", "postgresql connection string")
  .option("--stripe-secret-key <key>", "Stripe secret key (optional; billing routes require it)")
  .action((name: string, opts: { databaseUrl: string; stripeSecretKey?: string }) => {
    writeEnvFile(name, { databaseUrl: opts.databaseUrl, stripeSecretKey: opts.stripeSecretKey });
    console.log(`.env written for "${name}".`);
  });

program
  .command("migrate")
  .argument("<name>")
  .action((name: string) => {
    console.log("Syncing schema.prisma to the database (prisma db push)...");
    const result = prismaMigrate(name);
    console.log(result.output);
  });

program
  .command("build")
  .argument("<name>")
  .action((name: string) => {
    console.log("Installing dependencies...");
    npmInstall(name);
    console.log("Generating Prisma client...");
    prismaGenerate(name);
    console.log("Running production build...");
    const result = npmBuild(name);
    console.log(result.output);
    console.log("Build succeeded.");
  });

program.parseAsync(process.argv);
