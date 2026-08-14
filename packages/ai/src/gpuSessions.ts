import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// packages/ai/src/gpuSessions.ts -> repo root is three levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "../../..");
const STATE_PATH = path.join(REPO_ROOT, ".hermes", "gpu-sessions.json");

export interface GpuSession {
  startedAt: string;
  stoppedAt?: string;
}

export interface GpuSessionState {
  sessions: GpuSession[];
}

function readState(): GpuSessionState {
  if (!fs.existsSync(STATE_PATH)) return { sessions: [] };
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as GpuSessionState;
}

function writeState(state: GpuSessionState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/** Records a GPU start. No-op if a session is already open (idempotent). */
export function recordGpuStart(): void {
  const state = readState();
  const open = state.sessions.find((s) => !s.stoppedAt);
  if (open) return;
  state.sessions.push({ startedAt: new Date().toISOString() });
  writeState(state);
}

/** Closes the currently open session, if any. */
export function recordGpuStop(): void {
  const state = readState();
  const open = state.sessions.find((s) => !s.stoppedAt);
  if (!open) return;
  open.stoppedAt = new Date().toISOString();
  writeState(state);
}

export function readGpuSessions(): GpuSession[] {
  return readState().sessions;
}

/** Total GPU seconds across all sessions; an open session counts up to now. */
export function totalGpuSeconds(now: Date = new Date()): number {
  return readGpuSessions().reduce((total, session) => {
    const start = new Date(session.startedAt).getTime();
    const end = session.stoppedAt ? new Date(session.stoppedAt).getTime() : now.getTime();
    return total + Math.max(0, (end - start) / 1000);
  }, 0);
}
