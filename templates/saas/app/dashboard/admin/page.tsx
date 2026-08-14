import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";

export default async function AdminPage() {
  const user = await getCurrentUser();
  // Defense in depth: middleware.ts already blocks non-admins from this route.
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2 pr-4">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">{u.email}</td>
              <td className="py-2 pr-4">{u.role}</td>
              <td className="py-2 pr-4">{u.createdAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
