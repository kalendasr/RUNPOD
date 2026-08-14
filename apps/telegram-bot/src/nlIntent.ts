import type { AIProvider } from "@hermes/ai";

export interface CreateProjectIntent {
  name: string;
  type: "website" | "saas" | "ecommerce" | "ai-saas";
  features: string[];
}

export type ParsedIntent = { kind: "create_project"; intent: CreateProjectIntent } | { kind: "unrecognized" };

const VALID_TYPES = ["website", "saas", "ecommerce", "ai-saas"];

const SYSTEM_PROMPT = `You turn a one-line natural-language request into a JSON project-creation intent for a software factory.

Respond with ONLY a JSON object, no other text, no markdown fences. Shape:
{"name": "kebab-case-project-name", "type": "website|saas|ecommerce|ai-saas", "features": ["feature-one", "feature-two"]}

If the message isn't a request to build/create something, respond with exactly: {"unrecognized": true}

Rules:
- name must be lowercase kebab-case, derived from the request (e.g. company/product name mentioned).
- type: "website" for marketing sites/landing pages/portfolios; "saas" for anything with accounts, dashboards, subscriptions, CRUD; "ecommerce" for stores/products/checkout; "ai-saas" only if AI/LLM features are explicitly the product.
- features: short kebab-case tags for what was asked for (e.g. "contact-form", "pricing", "authentication"). Empty array if none mentioned.`;

function kebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "untitled-project";
}

function isValidIntent(value: unknown): value is CreateProjectIntent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && VALID_TYPES.includes(v.type as string) && Array.isArray(v.features);
}

/**
 * Parses free text like "Build me a landing page for Alpha Red" into a
 * structured create-project intent, using whichever AI provider is
 * available (local, falling back to hosted — see packages/ai). Returns
 * "unrecognized" rather than throwing if the model can't produce a valid
 * intent, or if no provider is reachable at all — natural language is a
 * convenience on top of the slash commands, never a requirement.
 */
export async function parseNaturalLanguageIntent(provider: AIProvider, text: string): Promise<ParsedIntent> {
  if (!(await provider.isAvailable())) return { kind: "unrecognized" };

  let raw: string;
  try {
    const result = await provider.complete({ system: SYSTEM_PROMPT, prompt: text, maxTokens: 200, temperature: 0 });
    raw = result.text;
  } catch {
    return { kind: "unrecognized" };
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { kind: "unrecognized" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { kind: "unrecognized" };
  }

  if (!isValidIntent(parsed)) return { kind: "unrecognized" };

  return { kind: "create_project", intent: { ...parsed, name: kebabCase(parsed.name) } };
}
