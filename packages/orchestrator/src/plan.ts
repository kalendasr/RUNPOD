import type { AIProvider } from "@hermes/ai";
import { ALL_PAGE_KINDS, type PageKind } from "@hermes/website-factory";
import { validateEntitySpec, type EntitySpec } from "@hermes/saas-factory";

export interface WebsitePlan {
  type: "website";
  projectName: string;
  siteName: string;
  siteDescription: string;
  pages: PageKind[];
}

export interface AppPlan {
  type: "saas" | "ecommerce" | "ai-saas";
  projectName: string;
  siteName: string;
  siteDescription: string;
  entities: EntitySpec[];
}

export type ProjectPlan = WebsitePlan | AppPlan;

export interface PlanResult {
  plan: ProjectPlan;
  /** Markdown content for the project's requirements.md (roadmap §10, Planner output). */
  requirements: string;
  /** Markdown content for the project's architecture.md. */
  architecture: string;
}

export class PlanningFailedError extends Error {}

/** The model looked at the brief and decided it isn't a build request at all. */
export class PlanDeclinedError extends PlanningFailedError {}

const SYSTEM_PROMPT = `You are the Planner in an autonomous software factory. Given a one-paragraph
brief, decide what to build and respond with ONLY a JSON object (no prose, no markdown fences).

If the message is not a request to build/create a website or app (e.g. it's a greeting, a
question, small talk), respond with exactly: {"unrecognized": true}

Shape:
{
  "type": "website" | "saas" | "ecommerce" | "ai-saas",
  "projectName": "kebab-case-name",
  "siteName": "Human Readable Name",
  "siteDescription": "one sentence",
  "pages": ["home", "about", "services", "projects", "contact"],
  "entities": [{"name": "PascalCaseEntity", "fields": ["camelCaseField", ...]}],
  "requirements": "markdown content for requirements.md",
  "architecture": "markdown content for architecture.md"
}

Rules:
- "type": "website" for a static/marketing site with no accounts or data the user manages.
  "saas"/"ecommerce"/"ai-saas" for anything with user accounts, a dashboard, or data entities.
- Include "pages" (a subset of home/about/services/projects/contact, always including "home")
  ONLY when type is "website". Omit it otherwise.
- Include "entities" ONLY when type is "saas"/"ecommerce"/"ai-saas" — one entry per distinct
  thing the brief says the user manages (e.g. "manage customers and quotations" -> two entities).
  Each entity needs at least one field. Omit "entities" for type "website".
- "requirements" and "architecture" are short markdown documents (a few bullet points each),
  not empty strings.
- "projectName" must be lowercase kebab-case, derived from the brief (company/product name).`;

function isPageKind(value: unknown): value is PageKind {
  return typeof value === "string" && (ALL_PAGE_KINDS as string[]).includes(value);
}

function kebabCase(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "untitled-project"
  );
}

function extractJson(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new PlanningFailedError(`No JSON object found in planner response: ${raw.slice(0, 200)}`);
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    throw new PlanningFailedError(`Planner response was not valid JSON: ${(err as Error).message}`);
  }
}

/**
 * Turns a natural-language brief into a structured project plan. This is
 * the factory's Planner (roadmap §10): reasoning about *what* to build is
 * the AI's job; every subsequent step (scaffolding the actual files) is a
 * deterministic tool driven by this plan's output, never free-form
 * AI-written code (roadmap §2 Core principle).
 */
export async function planProject(provider: AIProvider, brief: string): Promise<PlanResult> {
  const result = await provider.complete({ system: SYSTEM_PROMPT, prompt: brief, maxTokens: 1500, temperature: 0.2 });
  const parsed = extractJson(result.text) as Record<string, unknown>;

  if (parsed.unrecognized === true) {
    throw new PlanDeclinedError("The brief doesn't look like a request to build something.");
  }

  if (typeof parsed.requirements !== "string" || !parsed.requirements.trim()) {
    throw new PlanningFailedError("Planner response is missing non-empty 'requirements'");
  }
  if (typeof parsed.architecture !== "string" || !parsed.architecture.trim()) {
    throw new PlanningFailedError("Planner response is missing non-empty 'architecture'");
  }
  if (typeof parsed.siteName !== "string" || !parsed.siteName.trim()) {
    throw new PlanningFailedError("Planner response is missing non-empty 'siteName'");
  }

  const projectName = kebabCase(String(parsed.projectName ?? parsed.siteName));
  const siteName = String(parsed.siteName);
  const siteDescription = String(parsed.siteDescription ?? "");

  let plan: ProjectPlan;

  if (parsed.type === "website") {
    const rawPages = Array.isArray(parsed.pages) ? parsed.pages : [];
    const pages = rawPages.filter(isPageKind);
    if (!pages.includes("home")) pages.unshift("home");
    plan = { type: "website", projectName, siteName, siteDescription, pages: [...new Set(pages)] };
  } else if (parsed.type === "saas" || parsed.type === "ecommerce" || parsed.type === "ai-saas") {
    const rawEntities = Array.isArray(parsed.entities) ? parsed.entities : [];
    const entities: EntitySpec[] = [];
    for (const raw of rawEntities) {
      if (typeof raw !== "object" || raw === null) continue;
      const candidate = raw as { name?: unknown; fields?: unknown };
      if (typeof candidate.name !== "string" || !Array.isArray(candidate.fields)) continue;
      const entity: EntitySpec = { name: candidate.name, fields: candidate.fields.filter((f) => typeof f === "string") };
      try {
        validateEntitySpec(entity);
        entities.push(entity);
      } catch {
        // skip an entity the planner got wrong (bad casing, no fields) rather
        // than failing the whole plan over one malformed entry
      }
    }
    plan = { type: parsed.type, projectName, siteName, siteDescription, entities };
  } else {
    throw new PlanningFailedError(`Planner returned an unknown project type: ${JSON.stringify(parsed.type)}`);
  }

  return { plan, requirements: parsed.requirements, architecture: parsed.architecture };
}
