import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { siteConfig } from "@/lib/site-config";

export default function LandingPage() {
  return (
    <>
      <PublicNav />
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{siteConfig.name}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">{siteConfig.description}</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>
      </section>
    </>
  );
}
