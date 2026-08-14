import fs from "node:fs";
import path from "node:path";
import type { AIProvider } from "@hermes/ai";
import { projectDir } from "@hermes/projects";
import type { FixStrategy } from "@hermes/testing";

const MAX_FILE_CONTENT_CHARS = 6000;
const MAX_OUTPUT_CHARS = 3000;

const SYSTEM_PROMPT = `You are the Debugger in an autonomous software factory. A build/test step
failed. You are given the failure output and, if one could be identified, the current content
of the file most likely at fault.

Respond with ONLY a JSON object (no prose, no markdown fences):
{"filePath": "relative/path/from/project/root.ts", "newContent": "...", "description": "one sentence"}

If you cannot identify a fix, respond with exactly: {"noFix": true}

Rules:
- filePath must be a path relative to the project root, never starting with "/" or containing "..".
- newContent must be the file's ENTIRE corrected content, not a diff or a partial snippet.
- Make the smallest change that could plausibly fix the reported failure.`;

// Matches a relative-looking file path with a common source extension,
// as it would appear inside build/lint/test output (e.g.
// "app/contact/page.tsx:12:5 - error ...").
const FILE_PATH_PATTERN = /([a-zA-Z0-9_.\-/]+\.(?:tsx?|jsx?|prisma|css))(?::\d+)?/;

function extractLikelyFilePath(output: string): string | undefined {
  const match = output.match(FILE_PATH_PATTERN);
  return match?.[1];
}

/** Resolves a model-provided relative path and rejects anything that would escape the project directory. */
function resolveSafePath(root: string, relativePath: string): string | undefined {
  if (relativePath.startsWith("/") || relativePath.includes("..")) return undefined;
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) return undefined;
  return resolved;
}

function extractJson(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[0]);
  } catch {
    return undefined;
  }
}

/**
 * The factory's Debugger (roadmap §10). Proposes one targeted file fix per
 * failure — never a full regenerate — and the change is only ever "real"
 * once the bounded BUILD->TEST->FIX loop (`packages/testing`) re-runs the
 * actual build/tests against it (roadmap §2 Core principle: never trust
 * the AI's own claim of success). If anything about the model's response
 * is unusable (no JSON, an escaping path, `{"noFix": true}`), this returns
 * `applied: false` and the loop escalates exactly as it would with
 * `NoOpFixStrategy` — a failed fix attempt is not a crash.
 */
export class AIFixStrategy implements FixStrategy {
  constructor(
    private readonly provider: AIProvider,
    private readonly projectName: string,
  ) {}

  async attemptFix(context: { attempt: number; failedStep: "build" | "unit" | "browser"; output: string }): Promise<{
    applied: boolean;
    description: string;
  }> {
    if (!(await this.provider.isAvailable())) {
      return { applied: false, description: "No AI provider available; cannot attempt an automatic fix." };
    }

    const root = projectDir(this.projectName);
    const truncatedOutput = context.output.slice(0, MAX_OUTPUT_CHARS);
    const likelyPath = extractLikelyFilePath(truncatedOutput);
    const safeLikelyPath = likelyPath ? resolveSafePath(root, likelyPath) : undefined;

    let fileContext = "";
    if (safeLikelyPath && fs.existsSync(safeLikelyPath)) {
      const content = fs.readFileSync(safeLikelyPath, "utf8").slice(0, MAX_FILE_CONTENT_CHARS);
      fileContext = `\n\nCurrent content of ${likelyPath}:\n\`\`\`\n${content}\n\`\`\``;
    }

    const prompt = `Failed step: ${context.failedStep}\nAttempt: ${context.attempt}\n\nFailure output:\n${truncatedOutput}${fileContext}`;

    let raw: string;
    try {
      const result = await this.provider.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 2000, temperature: 0.1 });
      raw = result.text;
    } catch (err) {
      return { applied: false, description: `AI provider request failed: ${(err as Error).message}` };
    }

    const parsed = extractJson(raw) as { filePath?: unknown; newContent?: unknown; description?: unknown; noFix?: unknown } | undefined;
    if (!parsed || parsed.noFix === true) {
      return { applied: false, description: "AI Debugger could not identify a fix for this failure." };
    }
    if (typeof parsed.filePath !== "string" || typeof parsed.newContent !== "string") {
      return { applied: false, description: "AI Debugger response was missing filePath/newContent." };
    }

    const targetPath = resolveSafePath(root, parsed.filePath);
    if (!targetPath) {
      return { applied: false, description: `AI Debugger proposed an unsafe file path outside the project: ${parsed.filePath}` };
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, parsed.newContent, "utf8");

    return {
      applied: true,
      description: typeof parsed.description === "string" ? parsed.description : `Modified ${parsed.filePath}`,
    };
  }
}
