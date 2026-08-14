export type ProjectType = "website" | "saas" | "ecommerce" | "ai-saas";

export const ACTIVE_STATUSES = [
  "DRAFT",
  "PLANNING",
  "APPROVED",
  "BUILDING",
  "TESTING",
  "FIXING",
  "REVIEW",
  "READY_TO_DEPLOY",
  "DEPLOYING",
  "DEPLOYED",
] as const;

export const FAILURE_STATUSES = [
  "FAILED_BUILD",
  "FAILED_TESTS",
  "FAILED_DEPLOYMENT",
  "BLOCKED",
] as const;

export type ProjectStatus =
  | (typeof ACTIVE_STATUSES)[number]
  | (typeof FAILURE_STATUSES)[number];

export interface ProjectStack {
  frontend?: string;
  language?: string;
  database?: string;
  orm?: string;
}

export interface ProjectDeployment {
  provider: string;
}

export interface ProjectTesting {
  unit: boolean;
  integration: boolean;
  browser: boolean;
}

export interface ProjectManifest {
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  stack: ProjectStack;
  features: string[];
  deployment: ProjectDeployment;
  testing: ProjectTesting;
}

export interface LogEntry {
  timestamp: string;
  event: string;
  from?: ProjectStatus;
  to?: ProjectStatus;
  reason?: string;
  actor?: string;
  sandboxRunning?: boolean;
}
