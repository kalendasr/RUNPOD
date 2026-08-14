import type { AIProvider, CompletionRequest, CompletionResult } from "./types.js";

export interface RoutedCompletionResult extends CompletionResult {
  /** true if the primary (local) provider was unavailable and we fell back. */
  fellBack: boolean;
}

/**
 * Prefers `primary` (local GPU) when reachable, otherwise falls back to
 * `fallback` (hosted). Local inference is an optimization — cost, latency,
 * privacy — never a hard dependency (roadmap §7 / docs/environment-strategy.md §4).
 */
export class ProviderRouter implements AIProvider {
  readonly name = "router";

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
  ) {}

  get model(): string {
    return this.primary.model;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.primary.isAvailable()) || (await this.fallback.isAvailable());
  }

  async complete(request: CompletionRequest): Promise<RoutedCompletionResult> {
    if (await this.primary.isAvailable()) {
      try {
        const result = await this.primary.complete(request);
        return { ...result, fellBack: false };
      } catch {
        // fall through to hosted fallback
      }
    }

    if (!(await this.fallback.isAvailable())) {
      throw new Error("No AI provider available: local provider is unreachable and no hosted fallback is configured.");
    }

    const result = await this.fallback.complete(request);
    return { ...result, fellBack: true };
  }
}
