import { describe, expect, it } from "vitest";
import { ProviderRouter } from "../src/router.js";
import type { AIProvider, CompletionRequest, CompletionResult } from "../src/types.js";

function fakeProvider(name: string, opts: { available: boolean; fail?: boolean }): AIProvider {
  return {
    name,
    model: `${name}-model`,
    async isAvailable() {
      return opts.available;
    },
    async complete(_request: CompletionRequest): Promise<CompletionResult> {
      if (opts.fail) throw new Error(`${name} failed`);
      return { text: `response from ${name}`, provider: name, model: `${name}-model`, durationMs: 1 };
    },
  };
}

describe("ProviderRouter", () => {
  it("uses the primary provider when it is available", async () => {
    const router = new ProviderRouter(
      fakeProvider("local", { available: true }),
      fakeProvider("hosted", { available: true }),
    );
    const result = await router.complete({ prompt: "hi" });
    expect(result.provider).toBe("local");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to hosted when the local provider is unavailable", async () => {
    const router = new ProviderRouter(
      fakeProvider("local", { available: false }),
      fakeProvider("hosted", { available: true }),
    );
    const result = await router.complete({ prompt: "hi" });
    expect(result.provider).toBe("hosted");
    expect(result.fellBack).toBe(true);
  });

  it("falls back to hosted when the local provider throws mid-request", async () => {
    const router = new ProviderRouter(
      fakeProvider("local", { available: true, fail: true }),
      fakeProvider("hosted", { available: true }),
    );
    const result = await router.complete({ prompt: "hi" });
    expect(result.provider).toBe("hosted");
    expect(result.fellBack).toBe(true);
  });

  it("throws when neither provider is available", async () => {
    const router = new ProviderRouter(
      fakeProvider("local", { available: false }),
      fakeProvider("hosted", { available: false }),
    );
    await expect(router.complete({ prompt: "hi" })).rejects.toThrow(/No AI provider available/);
  });
});
