import { describe, expect, it, vi } from "vitest";
import { parseNaturalLanguageIntent } from "../src/nlIntent.js";
import type { AIProvider, CompletionResult } from "@hermes/ai";

function fakeProvider(available: boolean, responseText: string): AIProvider {
  return {
    name: "fake",
    model: "fake-model",
    isAvailable: vi.fn(async () => available),
    complete: vi.fn(async (): Promise<CompletionResult> => ({
      text: responseText,
      provider: "fake",
      model: "fake-model",
      durationMs: 1,
    })),
  };
}

describe("parseNaturalLanguageIntent", () => {
  it("returns unrecognized when no provider is available", async () => {
    const provider = fakeProvider(false, "");
    const result = await parseNaturalLanguageIntent(provider, "Build me a landing page for Alpha Red");
    expect(result).toEqual({ kind: "unrecognized" });
  });

  it("parses a valid JSON intent from the model", async () => {
    const provider = fakeProvider(
      true,
      '{"name": "Alpha Red", "type": "website", "features": ["landing-page", "contact-form"]}',
    );
    const result = await parseNaturalLanguageIntent(provider, "Build me a landing page for Alpha Red");
    expect(result).toEqual({
      kind: "create_project",
      intent: { name: "alpha-red", type: "website", features: ["landing-page", "contact-form"] },
    });
  });

  it("handles the model wrapping JSON in prose or markdown fences", async () => {
    const provider = fakeProvider(
      true,
      'Sure, here you go:\n```json\n{"name": "alpha-red", "type": "saas", "features": []}\n```',
    );
    const result = await parseNaturalLanguageIntent(provider, "make me a saas for alpha red");
    expect(result).toEqual({
      kind: "create_project",
      intent: { name: "alpha-red", type: "saas", features: [] },
    });
  });

  it("returns unrecognized when the model declines", async () => {
    const provider = fakeProvider(true, '{"unrecognized": true}');
    const result = await parseNaturalLanguageIntent(provider, "what's the weather like");
    expect(result).toEqual({ kind: "unrecognized" });
  });

  it("returns unrecognized when the model returns an invalid type", async () => {
    const provider = fakeProvider(true, '{"name": "x", "type": "mobile-app", "features": []}');
    const result = await parseNaturalLanguageIntent(provider, "build me a mobile app");
    expect(result).toEqual({ kind: "unrecognized" });
  });

  it("returns unrecognized when the provider throws", async () => {
    const provider = fakeProvider(true, "");
    provider.complete = vi.fn(async () => {
      throw new Error("boom");
    });
    const result = await parseNaturalLanguageIntent(provider, "build me something");
    expect(result).toEqual({ kind: "unrecognized" });
  });
});
