"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects, getGpuStatus, type ProjectListItem } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

const POLL_MS = 5000;

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [gpuStatus, setGpuStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [projectList, gpu] = await Promise.all([
          listProjects(),
          getGpuStatus().catch(() => ({ status: "UNCONFIGURED" })),
        ]);
        if (cancelled) return;
        setProjects(projectList);
        setGpuStatus(gpu.status);
        setError(null);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm">
          <span className="text-gray-500">GPU:</span>
          <span
            className={
              gpuStatus === "RUNNING"
                ? "font-medium text-green-700"
                : gpuStatus === "EXITED"
                  ? "font-medium text-gray-500"
                  : "font-medium text-gray-400"
            }
          >
            {gpuStatus ?? "loading..."}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not reach factory-api: {error}
        </div>
      )}

      {projects === null && !error && <p className="text-gray-500">Loading projects...</p>}

      {projects !== null && projects.length === 0 && (
        <p className="text-gray-500">No projects yet. Create one with `hermes-project create`.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {projects?.map((project) => (
          <Link
            key={project.name}
            href={`/projects/${project.name}`}
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{project.type}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
