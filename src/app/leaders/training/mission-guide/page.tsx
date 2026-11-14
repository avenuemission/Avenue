"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { logout } from "@/lib/client/auth";
import { useLeaderGate } from "@/hooks/useLeaderGate";
import HeaderAvatar from "@/components/leaders/avenue/HeaderAvatar";
import { useState } from "react";
import MissionGuide, { guideBackLink } from "./_components/MissionGuide";

// The Avenue Mission Guide: a reading module linked from the Foundations
// training modules list. Full access only, like the rest of the journey.
// It is reading, not a tickable module, so it never changes anyone's
// Foundations count.
export default function MissionGuidePage() {
  const router = useRouter();
  const [back] = useState(() =>
    guideBackLink(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from"))
  );
  const { user, ready, error: gateError } = useLeaderGate({ pending: true });

  if (gateError) {
    return (
      <div className="avenue-night">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="panel p-5 md:p-8">
            <p className="text-amber-400">{gateError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-[44px] rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="avenue-night relative">
      {/* Header: the same sticky pill as the training hub */}
      <header className="sticky top-4 z-50 mx-4 mt-4 flex max-w-5xl items-center justify-between rounded-full border border-[var(--line)] bg-[var(--night-2)] py-2 pl-6 pr-2 lg:mx-auto">
        <span className="text-sm font-semibold text-[var(--ink)]">Leadership Journey</span>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Logout</span>
          </button>
          <HeaderAvatar user={user} />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href={back.href}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>

        <MissionGuide back={back} />
      </main>
    </div>
  );
}
