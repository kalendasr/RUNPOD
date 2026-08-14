"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No backend yet (Phase 3 delivers the UI; email delivery lands with
    // the SaaS factory's email skill in a later phase).
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p role="status" className="rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        Thanks for reaching out — we&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Name
        <input
          name="name"
          type="text"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Message
        <textarea
          name="message"
          required
          rows={4}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <Button type="submit">Send message</Button>
    </form>
  );
}
