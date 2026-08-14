import type { AIProvider, CompletionRequest, CompletionResult } from "./types.js";

export interface HostedOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

/**
 * Anthropic-compatible Messages API provider. This is the always-available
 * fallback so the factory keeps working when the local GPU is off or
 * unreachable (roadmap §7: "must continue functioning if the local GPU is
 * unavailable").
 */
export class HostedProvider implements AIProvider {
  readonly name = "hosted";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: HostedOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 1024,
          temperature: request.temperature,
          system: request.system,
          messages: [{ role: "user", content: request.prompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Hosted provider request failed: ${res.status} ${await res.text()}`);
      }

      const body = (await res.json()) as { content: Array<{ text: string }> };
      return {
        text: body.content.map((block) => block.text).join(""),
        provider: this.name,
        model: this.model,
        durationMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
