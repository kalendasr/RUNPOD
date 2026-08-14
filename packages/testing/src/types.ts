export interface StepResult {
  passed: boolean;
  output: string;
  skipped?: boolean;
}

/** The three verification gates a project must pass, in order. */
export interface TestSteps {
  runBuild(): Promise<StepResult>;
  runUnitTests(): Promise<StepResult>;
  runBrowserTests(): Promise<StepResult>;
}

export type ProjectStatus =
  | "DRAFT"
  | "PLANNING"
  | "APPROVED"
  | "BUILDING"
  | "TESTING"
  | "FIXING"
  | "REVIEW"
  | "READY_TO_DEPLOY"
  | "DEPLOYING"
  | "DEPLOYED"
  | "FAILED_BUILD"
  | "FAILED_TESTS"
  | "FAILED_DEPLOYMENT"
  | "BLOCKED";

/** The lifecycle operations the cycle needs — injected so cycle.ts stays unit-testable. */
export interface LifecycleDriver {
  transition(status: ProjectStatus, options: { reason: string; actor: string }): void;
  log(event: string, data?: Record<string, unknown>): void;
}

/**
 * Attempts to fix a failure before the next retry. No automatic code-fixing
 * AI is wired in yet (that requires an LLM in the loop — see roadmap Phase 7
 * for local inference, or an agent driving this cycle directly); the default
 * strategy is honest about that and just escalates. A real fixer can be
 * plugged in later without changing the loop mechanics.
 */
export interface FixStrategy {
  attemptFix(context: { attempt: number; failedStep: "build" | "unit" | "browser"; output: string }): Promise<{
    applied: boolean;
    description: string;
  }>;
}

export interface CycleOptions {
  maxAttempts: number;
}

export interface CycleResult {
  outcome: "REVIEW" | "FAILED_BUILD" | "FAILED_TESTS";
  attempts: number;
  reason: string;
}
