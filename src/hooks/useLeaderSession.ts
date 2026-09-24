"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { getCurrentUser, type User } from "@/lib/client/auth";
import { dedupedLeaderJson, LeaderFetchError } from "@/lib/client/dedupeFetch";

// What every leader page knows about who is signed in, provided once by
// app/leaders/layout.tsx. Per-page access rules (full access only, or not)
// stay in each page; this only carries the facts.
export interface LeaderSession {
  // The cached signed-in leader. Null until it has been read in the
  // browser, and for a signed-out visitor (the layout sends them to /login).
  user: User | null;
  // The answer from /api/leader-access: null until it arrives, and when it
  // failed (see accessFailure).
  fullAccess: boolean | null;
  // "refused": the server said this is not a leader (403). "error": the
  // check itself failed (network, 5xx, unreadable body). A 401 is neither:
  // leaderFetch is already sending the leader to /login.
  accessFailure: "refused" | "error" | null;
}

export const LeaderSessionContext = createContext<LeaderSession | null>(null);

export function useLeaderSession(): LeaderSession {
  const session = useContext(LeaderSessionContext);
  if (!session) throw new Error("useLeaderSession must be used inside app/leaders/layout.tsx");
  return session;
}

// The cached user is read with useSyncExternalStore so the server render
// and the first browser render agree (no user yet), then the browser value
// follows. The snapshot is kept stable while the stored value is the same.
// Nothing subscribes to changes: like the pages before the layout, a page
// reads who is signed in when it loads.
let lastKey: string | null = null;
let lastUser: User | null = null;
function readUser(): User | null {
  const user = getCurrentUser();
  const key = user ? JSON.stringify(user) : null;
  if (key !== lastKey) {
    lastKey = key;
    lastUser = user;
  }
  return lastUser;
}
const noSubscribe = () => () => {};

interface AccessAnswer {
  forUser: User;
  fullAccess: boolean | null;
  failure: "refused" | "error" | null;
}

// The layout's side: the signed-in user (undefined until read in the
// browser) and one /api/leader-access check per page load, shared with any
// other caller through dedupedLeaderJson.
export function useLeaderSessionState(): { user: User | null | undefined; session: LeaderSession } {
  const user = useSyncExternalStore<User | null | undefined>(noSubscribe, readUser, () => undefined);
  const [answer, setAnswer] = useState<AccessAnswer | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const settle = (fullAccess: boolean | null, failure: AccessAnswer["failure"]) => {
      if (!cancelled) setAnswer({ forUser: user, fullAccess, failure });
    };
    dedupedLeaderJson<{ full_access?: unknown } | null>("/api/leader-access")
      .then((data) => {
        const flag = data?.full_access;
        if (flag === true || flag === false) settle(flag, null);
        else {
          console.error("leaders layout: /api/leader-access returned no full_access flag");
          settle(null, "error");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof LeaderFetchError && cause.status === 401) return;
        if (cause instanceof LeaderFetchError && cause.status === 403) {
          settle(null, "refused");
          return;
        }
        console.error("leaders layout: access check failed", cause);
        settle(null, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const current = answer && answer.forUser === user ? answer : null;
  return {
    user,
    session: {
      user: user ?? null,
      fullAccess: current?.fullAccess ?? null,
      accessFailure: current?.failure ?? null,
    },
  };
}
