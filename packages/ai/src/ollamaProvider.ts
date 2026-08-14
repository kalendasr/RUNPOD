import type { AIProvider, CompletionRequest, CompletionResult } from "./types.js";

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  /** Reachability check timeout, in ms. Keep short: this gates fallback decisions. */
  timeoutMs?: number;
  /**
   * Context window. Measured on a 24GB RTX 3090 with qwen2.5-coder:32b:
   * the default 32768 context spills ~17% of layers to CPU (8.2 tok/s);
   * capping to 4096 keeps the whole model resident on GPU (37.5 tok/s).
   * Override per-provider if running a smaller model or bigger card.
   */
  numCtx?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly numCtx: number;

  constructor(options: OllamaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.numCtx = options.numCtx ?? 4096;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/api/version`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: request.prompt,
        system: request.system,
        stream: false,
        options: {
          num_predict: request.maxTokens,
          temperature: request.temperature,
          num_ctx: this.numCtx,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }

    const body = (await res.json()) as { response: string };
    return {
      text: body.response,
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }
}
