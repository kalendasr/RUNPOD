import { getProject, readLog, readTasks, taskProgress, type LogEntry, type ProjectStack } from "@hermes/projects";
import { readState, type DeploymentRecord } from "@hermes/deployment";

export interface TestStepSummary {
  step: "build" | "unit" | "browser";
  passed: boolean;
  skipped?: boolean;
  attempt: number;
  timestamp: string;
}

export interface ProjectSummary {
  name: string;
  type: string;
  status: string;
  stack: ProjectStack;
  features: string[];
  tasks: { text: string; done: boolean }[];
  taskProgress: { done: number; total: number };
  latestTests: TestStepSummary[];
  deployments: DeploymentRecord[];
  recentLog: LogEntry[];
}

const TEST_EVENTS = {
  build_step: "build",
  unit_test_step: "unit",
  browser_test_step: "browser",
} as const;

type LoggedTestStep = LogEntry & { passed?: boolean; skipped?: boolean; attempt?: number };

/** Latest result for each test step type found in the project's log. */
export function summarizeTests(log: LogEntry[]): TestStepSummary[] {
  const latest = new Map<TestStepSummary["step"], TestStepSummary>();
  for (const raw of log) {
    const step = TEST_EVENTS[raw.event as keyof typeof TEST_EVENTS];
    if (!step) continue;
    const entry = raw as LoggedTestStep;
    latest.set(step, {
      step,
      passed: Boolean(entry.passed),
      skipped: entry.skipped,
      attempt: entry.attempt ?? 0,
      timestamp: entry.timestamp,
    });
  }
  return [...latest.values()];
}

export function buildProjectSummary(name: string): ProjectSummary {
  const manifest = getProject(name);
  const log = readLog(name);
  const deployments = readState(name).deployments;

  return {
    name: manifest.name,
    type: manifest.type,
    status: manifest.status,
    stack: manifest.stack,
    features: manifest.features,
    tasks: readTasks(name),
    taskProgress: taskProgress(name),
    latestTests: summarizeTests(log),
    deployments,
    recentLog: log.slice(-50).reverse(),
  };
}
