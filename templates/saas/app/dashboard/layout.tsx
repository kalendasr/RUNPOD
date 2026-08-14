import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware.ts already redirects unauthenticated
  // requests, but Server Components should not assume a request reached
  // them only via middleware.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <DashboardNav email={user.email} role={user.role} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
