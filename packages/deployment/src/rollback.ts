import { stopContainer, runContainer } from "./containers.js";
import { lastSuccessfulDeployment } from "./state.js";
import { checkHealth } from "./healthCheck.js";

export interface RollbackResult {
  rolledBack: boolean;
  toTag?: string;
}

/** Redeploys the last known-good image after a failed deployment. */
export async function rollback(name: string, port: number, envFile?: string): Promise<RollbackResult> {
  const last = lastSuccessfulDeployment(name);
  if (!last) return { rolledBack: false };

  stopContainer(name);
  runContainer(name, last.tag, port, envFile);
  const healthy = await checkHealth(`http://localhost:${port}/`, 30_000);
  return { rolledBack: healthy, toTag: last.tag };
}
