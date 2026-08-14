import { getCurrentUser } from "@/lib/currentUser";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Welcome, {user?.email}. You are signed in as {user?.role.toLowerCase()}.
      </p>
    </section>
  );
}
