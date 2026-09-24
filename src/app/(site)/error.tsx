"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown when a public page cannot read its content. The cached copy of the
// page is kept for other visitors; this is only for a page that has never
// rendered or a render that just failed.
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="min-h-[70vh] bg-black flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <span className="eyebrow mb-4">Something went wrong</span>
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
          This page didn&apos;t load
        </h1>
        <p className="mt-6 text-[var(--muted)] md:text-lg leading-relaxed">
          We couldn&apos;t load this page just now. Please try again in a moment.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="bg-[var(--accent)] text-white px-10 py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-10 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]"
          >
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
