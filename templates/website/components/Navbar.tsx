import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function Navbar() {
  return (
    <header className="border-b border-slate-200">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <Link href="/" className="text-lg font-semibold text-slate-900">
          {siteConfig.name}
        </Link>
        <ul className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 sm:gap-6">
          {siteConfig.nav.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-slate-900">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
