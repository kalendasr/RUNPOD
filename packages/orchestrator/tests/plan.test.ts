import { describe, expect, it, vi } from "vitest";
import { planProject, PlanningFailedError, PlanDeclinedError } from "../src/plan.js";
import type { AIProvider, CompletionResult } from "@hermes/ai";

function fakeProvider(responseText: string): AIProvider {
  return {
    name: "fake",
    model: "fake-model",
    isAvailable: vi.fn(async () => true),
    complete: vi.fn(async (): Promise<CompletionResult> => ({
      text: responseText,
      provider: "fake",
      model: "fake-model",
      durationMs: 1,
    })),
  };
}

const websiteResponse = JSON.stringify({
  type: "website",
  projectName: "Alpha Red",
  siteName: "Alpha Red",
  siteDescription: "A modern landing page.",
  pages: ["home", "contact"],
  requirements: "- Responsive landing page\n- Contact form",
  architecture: "- Next.js + Tailwind",
});

const saasResponse = JSON.stringify({
  type: "saas",
  projectName: "construction-quotes",
  siteName: "Construction Quotes",
  siteDescription: "Manage customers, projects, and quotations.",
  entities: [
    { name: "Customer", fields: ["name", "email"] },
    { name: "Quotation", fields: ["title", "amount"] },
  ],
  requirements: "- Manage customers\n- Manage quotations",
  architecture: "- Next.js + Prisma + PostgreSQL",
});

describe("planProject", () => {
  it("parses a website plan and normalizes projectName to kebab-case", async () => {
    const result = await planProject(fakeProvider(websiteResponse), "Build me a landing page for Alpha Red");
    expect(result.plan).toEqual({
      type: "website",
      projectName: "alpha-red",
      siteName: "Alpha Red",
      siteDescription: "A modern landing page.",
      pages: ["home", "contact"],
    });
    expect(result.requirements).toContain("landing page");
    expect(result.architecture).toContain("Next.js");
  });

  it("always includes 'home' even if the model omits it", async () => {
    const response = JSON.stringify({
      type: "website",
      projectName: "x",
      siteName: "X",
      pages: ["about"],
      requirements: "r",
      architecture: "a",
    });
    const result = await planProject(fakeProvider(response), "brief");
    expect((result.plan as any).pages).toContain("home");
  });

  it("parses a saas plan with entities", async () => {
    const result = await planProject(fakeProvider(saasResponse), "Build a construction quotes SaaS");
    expect(result.plan).toEqual({
      type: "saas",
      projectName: "construction-quotes",
      siteName: "Construction Quotes",
      siteDescription: "Manage customers, projects, and quotations.",
      entities: [
        { name: "Customer", fields: ["name", "email"] },
        { name: "Quotation", fields: ["title", "amount"] },
      ],
    });
  });

  it("drops a malformed entity instead of failing the whole plan", async () => {
    const response = JSON.stringify({
      type: "saas",
      projectName: "x",
      siteName: "X",
      entities: [
        { name: "not-pascal-case", fields: ["a"] },
        { name: "Customer", fields: ["name"] },
      ],
      requirements: "r",
      architecture: "a",
    });
    const result = await planProject(fakeProvider(response), "brief");
    expect((result.plan as any).entities).toEqual([{ name: "Customer", fields: ["name"] }]);
  });

  it("handles the model wrapping JSON in prose or markdown fences", async () => {
    const response = `Here's the plan:\n\`\`\`json\n${websiteResponse}\n\`\`\``;
    const result = await planProject(fakeProvider(response), "brief");
    expect(result.plan.type).toBe("website");
  });

  it("throws PlanningFailedError when the response has no JSON object", async () => {
    await expect(planProject(fakeProvider("I cannot help with that."), "brief")).rejects.toThrow(PlanningFailedError);
  });

  it("throws PlanningFailedError when requirements is missing", async () => {
    const response = JSON.stringify({ type: "website", projectName: "x", siteName: "X", architecture: "a" });
    await expect(planProject(fakeProvider(response), "brief")).rejects.toThrow(/requirements/);
  });

  it("throws PlanDeclinedError when the model declines a non-build message", async () => {
    await expect(planProject(fakeProvider('{"unrecognized": true}'), "hello there")).rejects.toThrow(
      PlanDeclinedError,
    );
  });

  it("throws PlanningFailedError for an unknown project type", async () => {
    const response = JSON.stringify({
      type: "mobile-app",
      projectName: "x",
      siteName: "X",
      requirements: "r",
      architecture: "a",
    });
    await expect(planProject(fakeProvider(response), "brief")).rejects.toThrow(/unknown project type/i);
  });
});
