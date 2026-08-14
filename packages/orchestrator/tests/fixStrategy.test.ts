import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDirectories, projectDir } from "@hermes/projects";
import { AIFixStrategy } from "../src/fixStrategy.js";
import type { AIProvider, CompletionResult } from "@hermes/ai";

const TEST_NAME = "test-orchestrator-fixstrategy";

function fakeProvider(opts: { available?: boolean; responseText?: string; throws?: boolean }): AIProvider {
  return {
    name: "fake",
    model: "fake-model",
    isAvailable: vi.fn(async () => opts.available ?? true),
    complete: vi.fn(async (): Promise<CompletionResult> => {
      if (opts.throws) throw new Error("provider exploded");
      return { text: opts.responseText ?? "", provider: "fake", model: "fake-model", durationMs: 1 };
    }),
  };
}

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("AIFixStrategy", () => {
  it("writes the proposed fix and reports applied: true", async () => {
    ensureProjectDirectories(TEST_NAME);
    const response = JSON.stringify({
      filePath: "app/page.tsx",
      newContent: "export default function Page() { return null; }",
      description: "Fixed missing default export",
    });
    const strategy = new AIFixStrategy(fakeProvider({ responseText: response }), TEST_NAME);

    const result = await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "error in app/page.tsx" });

    expect(result).toEqual({ applied: true, description: "Fixed missing default export" });
    const written = fs.readFileSync(path.join(projectDir(TEST_NAME), "app/page.tsx"), "utf8");
    expect(written).toBe("export default function Page() { return null; }");
  });

  it("includes existing file content in the prompt when a likely path is found in the output", async () => {
    ensureProjectDirectories(TEST_NAME);
    const filePath = path.join(projectDir(TEST_NAME), "app", "page.tsx");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "export default function Broken() {", "utf8");

    const provider = fakeProvider({
      responseText: JSON.stringify({ filePath: "app/page.tsx", newContent: "fixed", description: "d" }),
    });
    const strategy = new AIFixStrategy(provider, TEST_NAME);
    await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "app/page.tsx:1:1 - error TS1005" });

    const promptArg = (provider.complete as any).mock.calls[0][0];
    expect(promptArg.prompt).toContain("export default function Broken()");
  });

  it("rejects a path that escapes the project directory", async () => {
    ensureProjectDirectories(TEST_NAME);
    const response = JSON.stringify({ filePath: "../../etc/passwd", newContent: "evil", description: "d" });
    const strategy = new AIFixStrategy(fakeProvider({ responseText: response }), TEST_NAME);

    const result = await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "some error" });

    expect(result.applied).toBe(false);
    expect(result.description).toMatch(/unsafe file path/i);
    expect(fs.existsSync("/etc/passwd.evil")).toBe(false);
  });

  it("rejects an absolute path", async () => {
    ensureProjectDirectories(TEST_NAME);
    const response = JSON.stringify({ filePath: "/etc/passwd", newContent: "evil", description: "d" });
    const strategy = new AIFixStrategy(fakeProvider({ responseText: response }), TEST_NAME);

    const result = await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "some error" });
    expect(result.applied).toBe(false);
  });

  it("reports applied: false when the model declines with noFix", async () => {
    ensureProjectDirectories(TEST_NAME);
    const strategy = new AIFixStrategy(fakeProvider({ responseText: '{"noFix": true}' }), TEST_NAME);
    const result = await strategy.attemptFix({ attempt: 1, failedStep: "unit", output: "flaky timeout" });
    expect(result.applied).toBe(false);
  });

  it("reports applied: false for an unparseable response", async () => {
    ensureProjectDirectories(TEST_NAME);
    const strategy = new AIFixStrategy(fakeProvider({ responseText: "I'm not sure what happened." }), TEST_NAME);
    const result = await strategy.attemptFix({ attempt: 1, failedStep: "browser", output: "timeout" });
    expect(result.applied).toBe(false);
  });

  it("reports applied: false and never calls the provider when it's unavailable", async () => {
    ensureProjectDirectories(TEST_NAME);
    const provider = fakeProvider({ available: false });
    const strategy = new AIFixStrategy(provider, TEST_NAME);
    const result = await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "error" });
    expect(result.applied).toBe(false);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("reports applied: false when the provider throws", async () => {
    ensureProjectDirectories(TEST_NAME);
    const strategy = new AIFixStrategy(fakeProvider({ throws: true }), TEST_NAME);
    const result = await strategy.attemptFix({ attempt: 1, failedStep: "build", output: "error" });
    expect(result.applied).toBe(false);
    expect(result.description).toContain("provider exploded");
  });
});
