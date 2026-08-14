import fs from "node:fs";
import path from "node:path";
import { projectDir } from "@hermes/projects";

export interface DeploymentRecord {
  tag: string;
  status: "success" | "failed";
  port: number;
  timestamp: string;
}

export interface DeploymentState {
  deployments: DeploymentRecord[];
}

function statePath(name: string): string {
  return path.join(projectDir(name), ".hermes-deploy.json");
}

export function readState(name: string): DeploymentState {
  const filePath = statePath(name);
  if (!fs.existsSync(filePath)) return { deployments: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as DeploymentState;
}

function writeState(name: string, state: DeploymentState): void {
  fs.mkdirSync(projectDir(name), { recursive: true });
  fs.writeFileSync(statePath(name), JSON.stringify(state, null, 2), "utf8");
}

export function recordDeployment(name: string, record: DeploymentRecord): void {
  const state = readState(name);
  state.deployments.push(record);
  writeState(name, state);
}

/** The most recent deployment that passed health + smoke checks — the rollback target. */
export function lastSuccessfulDeployment(name: string): DeploymentRecord | undefined {
  const state = readState(name);
  return [...state.deployments].reverse().find((d) => d.status === "success");
}
