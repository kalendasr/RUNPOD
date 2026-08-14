#!/usr/bin/env node
import { Command } from "commander";
import { providerFromEnv, gpuConfigFromEnv } from "./config.js";
import { podStatus, startGpu, stopGpu, waitUntilRunning } from "./gpu.js";

const program = new Command();
program.name("hermes-ai").description("Hermes Digital Factory AI provider control");

program
  .command("ask")
  .argument("<prompt>", "prompt to send to the configured provider (local, falling back to hosted)")
  .option("--system <system>", "system prompt")
  .option("--max-tokens <n>", "max tokens", "512")
  .action(async (prompt: string, opts: { system?: string; maxTokens: string }) => {
    const provider = providerFromEnv();
    const start = Date.now();
    const result = await provider.complete({
      prompt,
      system: opts.system,
      maxTokens: Number(opts.maxTokens),
    });
    console.log(result.text);
    console.error(
      `\n[provider=${result.provider} model=${result.model} durationMs=${Date.now() - start}]`,
    );
  });

program
  .command("gpu-status")
  .action(async () => {
    const status = await podStatus(gpuConfigFromEnv());
    console.log(status);
  });

program
  .command("gpu-start")
  .action(async () => {
    const config = gpuConfigFromEnv();
    await startGpu(config);
    console.log("Start requested, waiting for RUNNING...");
    await waitUntilRunning(config);
    console.log("GPU pod is running.");
  });

program
  .command("gpu-stop")
  .action(async () => {
    await stopGpu(gpuConfigFromEnv());
    console.log("Stop requested.");
  });

program.parseAsync(process.argv);
