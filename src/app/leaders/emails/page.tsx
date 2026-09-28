"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLeaderGate } from "@/hooks/useLeaderGate";
import EmailPrefsPanel from "@/components/leaders/emails/EmailPrefsPanel";

// Where "Manage emails" in every leader email lands (spec 3.2 footer).
// The same panel as the profile sheet, behind the usual leader gate.
export default function LeaderEmailsPage() {
  const { ready, error } = useLeaderGate();
  return (
    <div className="avenue-night">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/leaders"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        {/* Henry to check wording */}
        <h1 className="mt-4 font-sans font-bold uppercase tracking-tight text-3xl text-[var(--ink)] md:text-4xl">Your emails</h1>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-amber-400">
            {error}
          </p>
        ) : null}
        {ready ? (
          <div className="mt-6">
            <EmailPrefsPanel />
          </div>
        ) : null}
      </main>
    </div>
  );
}
