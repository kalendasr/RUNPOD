import { totalGpuSeconds } from "./gpuSessions.js";

export interface GpuCostEstimate {
  totalSeconds: number;
  totalHours: number;
  hourlyRate: number;
  estimatedCost: number;
}

/**
 * Estimates GPU spend from recorded start/stop sessions (see gpuSessions.ts).
 * Only sessions started via startGpu()/stopGpu() are counted — a pod
 * started or stopped directly in the RunPod dashboard won't be tracked
 * here. This is an estimate, not a billing-accurate figure (roadmap §22).
 */
export function estimateGpuCost(hourlyRate: number, now: Date = new Date()): GpuCostEstimate {
  const totalSeconds = totalGpuSeconds(now);
  const totalHours = totalSeconds / 3600;
  return {
    totalSeconds,
    totalHours,
    hourlyRate,
    estimatedCost: totalHours * hourlyRate,
  };
}
