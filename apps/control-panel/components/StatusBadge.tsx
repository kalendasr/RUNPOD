const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PLANNING: "bg-gray-100 text-gray-700",
  APPROVED: "bg-blue-100 text-blue-700",
  BUILDING: "bg-amber-100 text-amber-700",
  TESTING: "bg-amber-100 text-amber-700",
  FIXING: "bg-amber-100 text-amber-700",
  REVIEW: "bg-blue-100 text-blue-700",
  READY_TO_DEPLOY: "bg-blue-100 text-blue-700",
  DEPLOYING: "bg-amber-100 text-amber-700",
  DEPLOYED: "bg-green-100 text-green-700",
  FAILED_BUILD: "bg-red-100 text-red-700",
  FAILED_TESTS: "bg-red-100 text-red-700",
  FAILED_DEPLOYMENT: "bg-red-100 text-red-700",
  BLOCKED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
