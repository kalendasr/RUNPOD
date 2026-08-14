import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function PublicNav() {
  return (
    <header className="border-b border-slate-200">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          {siteConfig.name}
        </Link>
        <div className="flex gap-4 text-sm font-medium text-slate-600">
          <Link href="/login" className="hover:text-slate-900">
            Log in
          </Link>
          <Link href="/register" className="hover:text-slate-900">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
