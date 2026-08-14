#!/usr/bin/env node
import { Command } from "commander";
import { scanForSecrets } from "./scanSecrets.js";

const program = new Command();
program.name("hermes-security").description("Hermes Digital Factory security checks");

program
  .command("scan")
  .argument("<dir>", "directory to scan for accidentally committed secrets")
  .action((dir: string) => {
    const findings = scanForSecrets(dir);
    if (findings.length === 0) {
      console.log("No secrets found.");
      return;
    }
    console.error(`Found ${findings.length} potential secret(s):`);
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.preview}`);
    }
    process.exitCode = 1;
  });

program.parseAsync(process.argv);
