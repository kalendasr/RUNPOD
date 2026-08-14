import { readManifest, writeManifest } from "./manifest.js";
import { appendLog } from "./logs.js";
import type { ProjectStatus } from "./types.js";

// Mirrors docs/project-lifecycle.md. BLOCKED is reachable from any active
// state and, once resolved, resumes into the state that triggered it — so
// it is listed as a valid destination from every active state, and as a
// valid source back into every active state.
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["PLANNING", "BLOCKED"],
  PLANNING: ["APPROVED", "BLOCKED"],
  APPROVED: ["BUILDING", "BLOCKED"],
  BUILDING: ["TESTING", "FAILED_BUILD", "BLOCKED"],
  TESTING: ["FIXING", "REVIEW", "FAILED_TESTS", "BLOCKED"],
  FIXING: ["TESTING", "BLOCKED"],
  REVIEW: ["READY_TO_DEPLOY", "FIXING", "BLOCKED"],
  READY_TO_DEPLOY: ["DEPLOYING", "BLOCKED"],
  DEPLOYING: ["DEPLOYED", "FAILED_DEPLOYMENT", "BLOCKED"],
  // Not fully terminal: a deployed project starts a new BUILDING cycle for
  // its next release (discovered in Phase 6 while proving redeploy/rollback
  // — the original design treated DEPLOYED as an end state, which left no
  // way to ship an update).
  DEPLOYED: ["BUILDING"],
  FAILED_BUILD: ["BUILDING", "BLOCKED"],
  FAILED_TESTS: ["TESTING", "BLOCKED"],
  FAILED_DEPLOYMENT: ["DEPLOYING", "BLOCKED"],
  BLOCKED: [
    "DRAFT",
    "PLANNING",
    "APPROVED",
    "BUILDING",
    "TESTING",
    "FIXING",
    "REVIEW",
    "READY_TO_DEPLOY",
    "DEPLOYING",
  ],
};

export class InvalidTransitionError extends Error {}

export function allowedTransitions(from: ProjectStatus): ProjectStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(
  name: string,
  to: ProjectStatus,
  options: { reason: string; actor: string },
): ProjectStatus {
  const manifest = readManifest(name);
  const from = manifest.status;

  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(
      `Project "${name}" cannot move from ${from} to ${to}. Allowed: ${allowedTransitions(from).join(", ") || "(none, terminal state)"}`,
    );
  }

  manifest.status = to;
  writeManifest(manifest);
  appendLog(name, {
    event: "status_transition",
    from,
    to,
    reason: options.reason,
    actor: options.actor,
  });
  return to;
}
