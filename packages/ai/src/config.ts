import { OllamaProvider } from "./ollamaProvider.js";
import { HostedProvider } from "./hostedProvider.js";
import { ProviderRouter } from "./router.js";
import type { GpuConfig } from "./gpu.js";
import type { AIProvider } from "./types.js";

/**
 * Reads provider configuration from the environment (see .env.example).
 * Never hard-codes credentials or endpoints (roadmap §19).
 */
export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): AIProvider {
  const ollama = new OllamaProvider({
    baseUrl: env.HERMES_AI_OLLAMA_URL ?? "http://127.0.0.1:11434",
    model: env.HERMES_AI_LOCAL_MODEL ?? "qwen2.5-coder:32b",
    numCtx: env.HERMES_AI_LOCAL_NUM_CTX ? Number(env.HERMES_AI_LOCAL_NUM_CTX) : undefined,
  });

  const hosted = new HostedProvider({
    baseUrl: env.HERMES_AI_HOSTED_URL ?? "https://api.anthropic.com",
    apiKey: env.HERMES_AI_HOSTED_API_KEY ?? "",
    model: env.HERMES_AI_HOSTED_MODEL ?? "claude-sonnet-5",
  });

  return new ProviderRouter(ollama, hosted);
}

export function gpuConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GpuConfig {
  const apiKey = env.RUNPOD_API_KEY;
  const podId = env.HERMES_AI_GPU_POD_ID;
  if (!apiKey || !podId) {
    throw new Error("RUNPOD_API_KEY and HERMES_AI_GPU_POD_ID must both be set to control the GPU pod.");
  }
  return { apiKey, podId };
}
