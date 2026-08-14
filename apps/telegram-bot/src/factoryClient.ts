export interface ProjectListItem {
  name: string;
  type: string;
  status: string;
}

export interface ProjectSummary {
  name: string;
  type: string;
  status: string;
  taskProgress: { done: number; total: number };
  latestTests: { step: string; passed: boolean; skipped?: boolean }[];
  deployments: { tag: string; status: string; port: number; timestamp: string }[];
}

export interface LogEntry {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

export class FactoryApiError extends Error {}

export class FactoryClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new FactoryApiError((body as { error?: string }).error ?? `${path} failed with ${res.status}`);
    }
    return body as T;
  }

  listProjects(): Promise<ProjectListItem[]> {
    return this.request("/projects");
  }

  getProject(name: string): Promise<ProjectSummary> {
    return this.request(`/projects/${encodeURIComponent(name)}`);
  }

  getLogs(name: string): Promise<LogEntry[]> {
    return this.request(`/projects/${encodeURIComponent(name)}/logs`);
  }

  createProject(input: { name: string; type: string; features?: string[] }): Promise<unknown> {
    return this.request("/projects", { method: "POST", body: JSON.stringify(input) });
  }

  runTests(name: string): Promise<{ outcome: string; attempts: number; reason: string }> {
    return this.request(`/projects/${encodeURIComponent(name)}/test`, { method: "POST", body: JSON.stringify({}) });
  }

  deploy(name: string, approvedBy: string): Promise<{ outcome: string; url?: string; reason: string }> {
    return this.request(`/projects/${encodeURIComponent(name)}/deploy`, {
      method: "POST",
      body: JSON.stringify({ approve: true, approvedBy }),
    });
  }

  stop(name: string, actor: string): Promise<{ wasRunning: boolean; running: boolean }> {
    return this.request(`/projects/${encodeURIComponent(name)}/stop`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    });
  }

  /** Full Planner -> Builder -> Tester -> Debugger pipeline (roadmap §11). Never deploys on its own. */
  runAutonomous(
    brief: string,
    maxAttempts?: number,
  ): Promise<{ projectName: string; outcome: string; attempts: number; reason: string; readyToDeploy: boolean }> {
    return this.request("/projects/autonomous", { method: "POST", body: JSON.stringify({ brief, maxAttempts }) });
  }
}
