"use client";

import { useEffect, useState } from "react";
import { getGpuCost, type GpuCostEstimate } from "@/lib/api";

export default function CostsPage() {
  const [cost, setCost] = useState<GpuCostEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGpuCost()
      .then(setCost)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Costs</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {cost && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-medium">GPU (RunPod RTX 3090)</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-gray-500">Total GPU time</dt>
              <dd className="font-medium">{cost.totalHours.toFixed(2)} h</dd>
            </div>
            <div>
              <dt className="text-gray-500">Hourly rate</dt>
              <dd className="font-medium">${cost.hourlyRate.toFixed(2)}/h</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estimated cost</dt>
              <dd className="font-medium">${cost.estimatedCost.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Sessions</dt>
              <dd className="font-medium">{cost.sessions.length}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">
            Estimate only — counts sessions started via the factory's own gpu-start/gpu-stop, not pods
            started or stopped directly in the RunPod dashboard. See docs/ai-provider.md.
          </p>
          <ul className="mt-4 space-y-1 font-mono text-xs text-gray-600">
            {[...cost.sessions].reverse().map((s, i) => (
              <li key={i}>
                {s.startedAt} → {s.stoppedAt ?? "running"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
