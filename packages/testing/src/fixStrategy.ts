import type { FixStrategy } from "./types.js";

/**
 * The default fixer: applies no automatic fix and says so. Real automatic
 * code repair needs an LLM in the loop (an agent driving this cycle, or the
 * local-inference setup in roadmap Phase 7) — until one is wired in as a
 * FixStrategy, being honest that "no fix was applied" is more useful than
 * pretending to fix things and silently retrying the same failure.
 */
export class NoOpFixStrategy implements FixStrategy {
  async attemptFix(context: { attempt: number; failedStep: string; output: string }) {
    return {
      applied: false,
      description: `No automatic fixer is configured for "${context.failedStep}" failures yet; escalating for human review after the retry budget is exhausted.`,
    };
  }
}
