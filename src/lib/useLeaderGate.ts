"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type User } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";

export const LEADER_GATE_ERROR = "We couldn't check your access. Check your connection and reload.";

// The same gate the training page uses: signed in, then full access, else
// back to the dashboard. `ready` is true only once both are confirmed.
// Only a real "no access" answer (403, or full_access false) redirects to
// /leaders. A failed check (network error, 5xx, unreadable body) sets
// `error` instead, so the page can say so rather than pretend access was
// refused. A 401 is left to leaderFetch, which sends the leader to /login.
export function useLeaderGate(): { user: User | null; ready: boolean; error: string | null } {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    let cancelled = false;
    const fail = (cause: unknown) => {
      console.error("useLeaderGate: access check failed", cause);
      if (!cancelled) setError(LEADER_GATE_ERROR);
    };
    (async () => {
      try {
        const res = await leaderFetch("/api/leader-access");
        if (cancelled || res.status === 401) return;
        if (res.status === 403) {
          router.push("/leaders");
          return;
        }
        if (!res.ok) {
          fail(new Error(`/api/leader-access returned ${res.status}`));
          return;
        }
        const data: unknown = await res.json();
        if (cancelled) return;
        const fullAccess = (data as { full_access?: unknown } | null)?.full_access;
        if (fullAccess === true) {
          setUser(current);
          setReady(true);
        } else if (fullAccess === false) {
          router.push("/leaders");
        } else {
          fail(new Error("/api/leader-access returned no full_access flag"));
        }
      } catch (cause) {
        fail(cause);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, ready, error };
}
