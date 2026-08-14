const API_BASE = process.env.NEXT_PUBLIC_FACTORY_API_URL ?? "http://localhost:4100";

export interface ProjectListItem {
  name: string;
  type: string;
  status: string;
}

export interface TestStepSummary {
  step: "build" | "unit" | "browser";
  passed: boolean;
  skipped?: boolean;
  attempt: number;
  timestamp: string;
}

export interface DeploymentRecord {
  tag: string;
  status: "success" | "failed";
  port: number;
  timestamp: string;
}

export interface LogEntry {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

export interface ProjectSummary {
  name: string;
  type: string;
  status: string;
  stack: Record<string, string | undefined>;
  features: string[];
  tasks: { text: string; done: boolean }[];
  taskProgress: { done: number; total: number };
  latestTests: TestStepSummary[];
  deployments: DeploymentRecord[];
  recentLog: LogEntry[];
}

export interface GpuCostEstimate {
  totalSeconds: number;
  totalHours: number;
  hourlyRate: number;
  estimatedCost: number;
  sessions: { startedAt: string; stoppedAt?: string }[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listProjects(): Promise<ProjectListItem[]> {
  return apiFetch("/projects");
}

export function getProjectSummary(name: string): Promise<ProjectSummary> {
  return apiFetch(`/projects/${encodeURIComponent(name)}`);
}

export function getProjectLogs(name: string): Promise<LogEntry[]> {
  return apiFetch(`/projects/${encodeURIComponent(name)}/logs`);
}

export function approveDeploy(name: string, approvedBy: string): Promise<{ outcome: string; url: string; reason: string }> {
  return apiFetch(`/projects/${encodeURIComponent(name)}/deploy`, {
    method: "POST",
    body: JSON.stringify({ approve: true, approvedBy }),
  });
}

export function getGpuStatus(): Promise<{ status: string }> {
  return apiFetch("/gpu/status");
}

export function getGpuCost(): Promise<GpuCostEstimate> {
  return apiFetch("/costs/gpu");
}
