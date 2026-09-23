"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type User } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";

// The same gate the training page uses: signed in, then full access, else
// back to the dashboard. `ready` is true only once both are confirmed.
export function useLeaderGate(): { user: User | null; ready: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    let cancelled = false;
    leaderFetch("/api/leader-access")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.full_access === true) {
          setUser(current);
          setReady(true);
        } else {
          router.push("/leaders");
        }
      })
      .catch(() => {
        if (!cancelled) router.push("/leaders");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, ready };
}
