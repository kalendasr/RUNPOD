import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { PublicNav } from "@/components/PublicNav";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <PublicNav />
      <section className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <h1 className="text-center text-2xl font-bold text-slate-900">Create account</h1>
        <div className="mt-8">
          <AuthForm mode="register" />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </p>
      </section>
    </>
  );
}
