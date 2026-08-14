"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProjectSummary, approveDeploy, type ProjectSummary } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";

const POLL_MS = 4000;

function TestBadge({ passed, skipped }: { passed: boolean; skipped?: boolean }) {
  if (skipped) return <span className="text-gray-400">skipped</span>;
  return passed ? (
    <span className="font-medium text-green-700">passed</span>
  ) : (
    <span className="font-medium text-red-700">failed</span>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ name: string }>();
  const name = params.name;

  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await getProjectSummary(name);
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
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
  }, [name]);

  async function handleDeploy() {
    if (!confirm(`Deploy "${name}" to production? This requires your explicit approval.`)) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const result = await approveDeploy(name, "dashboard-user");
      setDeployResult(`${result.outcome}: ${result.reason}`);
    } catch (err) {
      setDeployResult(`Error: ${(err as Error).message}`);
    } finally {
      setDeploying(false);
    }
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!summary) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const canDeploy = summary.status === "READY_TO_DEPLOY";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{summary.name}</h1>
          <p className="text-sm text-gray-500">{summary.type}</p>
        </div>
        <StatusBadge status={summary.status} />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Tasks</h2>
        <ProgressBar done={summary.taskProgress.done} total={summary.taskProgress.total} />
        <ul className="mt-3 space-y-1 text-sm">
          {summary.tasks.map((task) => (
            <li key={task.text} className={task.done ? "text-gray-400 line-through" : ""}>
              {task.done ? "✓" : "○"} {task.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Tests</h2>
        {summary.latestTests.length === 0 ? (
          <p className="text-sm text-gray-500">No test runs yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {summary.latestTests.map((t) => (
              <li key={t.step} className="flex justify-between">
                <span className="capitalize">{t.step}</span>
                <TestBadge passed={t.passed} skipped={t.skipped} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Deployment</h2>
          <button
            onClick={handleDeploy}
            disabled={!canDeploy || deploying}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            title={canDeploy ? "Approve and deploy to production" : "Only available when READY_TO_DEPLOY"}
          >
            {deploying ? "Deploying..." : "Approve & Deploy"}
          </button>
        </div>
        {deployResult && <p className="mb-3 text-sm text-gray-700">{deployResult}</p>}
        {summary.deployments.length === 0 ? (
          <p className="text-sm text-gray-500">No deployments yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...summary.deployments].reverse().map((d) => (
              <li key={d.tag + d.timestamp} className="flex justify-between">
                <span>
                  {d.timestamp} — tag {d.tag} — port {d.port}
                </span>
                <span className={d.status === "success" ? "text-green-700" : "text-red-700"}>{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Recent activity</h2>
        <ul className="space-y-1 font-mono text-xs text-gray-600">
          {summary.recentLog.map((entry, i) => (
            <li key={i}>
              {entry.timestamp} — {entry.event}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
