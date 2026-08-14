/**
 * RunPod GPU pod start/stop orchestration.
 *
 * The GPU inference server does not need to stay online 24/7 (roadmap §5,
 * §7): the factory starts it only when local inference is needed and stops
 * it once idle, so cost is incurred only while it's actually in use.
 */

const RUNPOD_API = "https://api.runpod.io/graphql";

export interface GpuConfig {
  apiKey: string;
  podId: string;
}

export type PodStatus = "RUNNING" | "EXITED" | "UNKNOWN";

async function runpodGraphQL<T>(apiKey: string, query: string): Promise<T> {
  const res = await fetch(`${RUNPOD_API}?api_key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) {
    throw new Error(`RunPod API error: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  return body.data as T;
}

export async function podStatus(config: GpuConfig): Promise<PodStatus> {
  const data = await runpodGraphQL<{ pod: { desiredStatus: string; runtime: unknown } | null }>(
    config.apiKey,
    `query { pod(input: {podId: "${config.podId}"}) { desiredStatus runtime { uptimeInSeconds } } }`,
  );

  if (!data.pod) return "UNKNOWN";
  if (data.pod.desiredStatus === "RUNNING" && data.pod.runtime) return "RUNNING";
  return "EXITED";
}

export async function startGpu(config: GpuConfig): Promise<void> {
  await runpodGraphQL(
    config.apiKey,
    `mutation { podResume(input: {podId: "${config.podId}"}) { id desiredStatus } }`,
  );
}

export async function stopGpu(config: GpuConfig): Promise<void> {
  await runpodGraphQL(
    config.apiKey,
    `mutation { podStop(input: {podId: "${config.podId}"}) { id desiredStatus } }`,
  );
}

/** Polls until the pod reports RUNNING with an active runtime, or times out. */
export async function waitUntilRunning(config: GpuConfig, timeoutMs = 120_000, pollMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await podStatus(config)) === "RUNNING") return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Timed out waiting for pod ${config.podId} to reach RUNNING`);
}

/** Runs `fn` with the GPU guaranteed started, then stops it again if it was off before. */
export async function withGpu<T>(config: GpuConfig, fn: () => Promise<T>): Promise<T> {
  const wasRunning = (await podStatus(config)) === "RUNNING";
  if (!wasRunning) {
    await startGpu(config);
    await waitUntilRunning(config);
  }

  try {
    return await fn();
  } finally {
    if (!wasRunning) {
      await stopGpu(config);
    }
  }
}
