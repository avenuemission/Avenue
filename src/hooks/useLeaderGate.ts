"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/client/auth";
import { useLeaderSession } from "@/hooks/useLeaderSession";

const LEADER_GATE_ERROR = "We couldn't check your access. Check your connection and reload.";

// The access gate for leader pages. Reads the session the leaders layout
// provides. By default a page needs full access (the emails page); pass
// { pending: true } for the Leader Training pages, which pending leaders
// (On-Ramp sign-ups, access requests) may open too. `ready` is true once
// the needed access is confirmed. Only a real "no access" answer redirects
// to /leaders. A failed check (network error, 5xx, unreadable body) sets
// `error` instead, so the page can say so rather than pretend access was
// refused. A 401 is left to leaderFetch, which sends the leader to /login.
export function useLeaderGate({ pending = false }: { pending?: boolean } = {}): {
  user: User | null;
  ready: boolean;
  error: string | null;
} {
  const router = useRouter();
  const { user, fullAccess, accessFailure } = useLeaderSession();
  const allowed = fullAccess === true || (pending && fullAccess === false);
  const refused = accessFailure === "refused" || (fullAccess !== null && !allowed);

  useEffect(() => {
    if (refused) router.push("/leaders");
  }, [refused, router]);

  const ready = allowed && user !== null;
  return {
    user: ready ? user : null,
    ready,
    error: accessFailure === "error" ? LEADER_GATE_ERROR : null,
  };
}
