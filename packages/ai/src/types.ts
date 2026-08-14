export interface CompletionRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
  durationMs: number;
}

/**
 * Every AI provider (local or hosted) implements this interface.
 * Nothing outside this package may depend on a provider's concrete shape
 * (roadmap §6: "Do not hard-code the entire system around one model").
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  /** Cheap reachability check; must not throw. */
  isAvailable(): Promise<boolean>;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export interface ProviderConfig {
  ollama?: {
    baseUrl: string;
    model: string;
  };
  hosted?: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}
