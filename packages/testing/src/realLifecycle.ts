import { transition, appendLog } from "@hermes/projects";
import type { LifecycleDriver, ProjectStatus } from "./types.js";

export function realLifecycleFor(projectName: string): LifecycleDriver {
  return {
    transition(status: ProjectStatus, options: { reason: string; actor: string }) {
      transition(projectName, status, options);
    },
    log(event: string, data: Record<string, unknown> = {}) {
      appendLog(projectName, { event, ...data });
    },
  };
}
