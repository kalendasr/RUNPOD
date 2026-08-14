import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { PublicNav } from "@/components/PublicNav";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <PublicNav />
      <section className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <h1 className="text-center text-2xl font-bold text-slate-900">Log in</h1>
        <div className="mt-8">
          <AuthForm mode="login" />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{" "}
          <Link href="/register" className="font-medium text-slate-900 underline">
            Create one
          </Link>
        </p>
      </section>
    </>
  );
}
