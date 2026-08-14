import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordGpuStart, recordGpuStop, readGpuSessions, totalGpuSeconds } from "../src/gpuSessions.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.resolve(here, "../../../.hermes/gpu-sessions.json");

beforeEach(() => {
  fs.rmSync(statePath, { force: true });
});

afterEach(() => {
  fs.rmSync(statePath, { force: true });
  vi.useRealTimers();
});

describe("gpu sessions", () => {
  it("records a start and stop as one closed session", () => {
    recordGpuStart();
    recordGpuStop();
    const sessions = readGpuSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].stoppedAt).toBeDefined();
  });

  it("is idempotent: starting twice does not open two sessions", () => {
    recordGpuStart();
    recordGpuStart();
    expect(readGpuSessions()).toHaveLength(1);
  });

  it("stopping with no open session is a no-op", () => {
    recordGpuStop();
    expect(readGpuSessions()).toHaveLength(0);
  });

  it("counts an open session up to now in totalGpuSeconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    recordGpuStart();
    const later = new Date("2026-01-01T00:10:00Z");
    expect(totalGpuSeconds(later)).toBeCloseTo(600, 0);
  });
});
