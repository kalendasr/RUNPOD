import type { ReactNode } from "react";

export function Hero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
      {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">{subtitle}</p> : null}
      {children ? <div className="mt-8 flex justify-center gap-4">{children}</div> : null}
    </section>
  );
}
