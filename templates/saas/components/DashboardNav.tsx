"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

export function DashboardNav({ email, role }: { email: string; role: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            {siteConfig.name}
          </Link>
          {role === "ADMIN" ? (
            <Link href="/dashboard/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Admin
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{email}</span>
          <button onClick={handleLogout} className="font-medium hover:text-slate-900">
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
