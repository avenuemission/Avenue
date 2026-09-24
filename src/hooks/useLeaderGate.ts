"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/client/auth";
import { useLeaderSession } from "@/hooks/useLeaderSession";

const LEADER_GATE_ERROR = "We couldn't check your access. Check your connection and reload.";

// The full-access gate for pages behind it (the calling and launch wizards,
// their printable pages, the emails page). Reads the session the leaders
// layout provides. `ready` is true only once full access is confirmed.
// Only a real "no access" answer (403, or full_access false) redirects to
// /leaders. A failed check (network error, 5xx, unreadable body) sets
// `error` instead, so the page can say so rather than pretend access was
// refused. A 401 is left to leaderFetch, which sends the leader to /login.
export function useLeaderGate(): { user: User | null; ready: boolean; error: string | null } {
  const router = useRouter();
  const { user, fullAccess, accessFailure } = useLeaderSession();
  const refused = fullAccess === false || accessFailure === "refused";

  useEffect(() => {
    if (refused) router.push("/leaders");
  }, [refused, router]);

  const ready = fullAccess === true && user !== null;
  return {
    user: ready ? user : null,
    ready,
    error: accessFailure === "error" ? LEADER_GATE_ERROR : null,
  };
}
