import { useState, useEffect } from "react";
import { User } from "@/lib/auth";
import type { NetworkPerson, NetworkDepth } from "./Phase5Multiply";

// Phase 5's discipleship network view for the leader training page: state,
// the load effect, and the apprenticeship step update. Moved out of
// page.tsx verbatim; the comments below still read as they did there.
// accessChecked and hasAccess gate the load effect exactly as they did in
// the page.
export function useNetworkView(user: User | null, accessChecked: boolean, hasAccess: boolean) {
  // Phase 5's discipleship network view. Also a completely separate data
  // source from training progress: it talks to /api/network, which already
  // carries apprenticeStep on every person and this viewer's depth. The step
  // itself is never duplicated into any local, page-owned state beyond a
  // one-for-one mirror of what the API returned, so the network row stays
  // the single source of truth for it.
  const [networkPeople, setNetworkPeople] = useState<NetworkPerson[]>([]);
  const [networkViewerId, setNetworkViewerId] = useState<string | null>(null);
  const [networkDepth, setNetworkDepth] = useState<NetworkDepth>({ generations: 0, people: 0 });
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [stepUpdatingId, setStepUpdatingId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<{ id: string; message: string } | null>(null);

  // Load this leader's discipleship network, independently of training
  // progress and check-ins above. Phase 5 reads apprenticeStep and depth
  // straight off this response; it never computes either itself, so the
  // family tree (/leaders/network) and this page are always the same data
  // seen twice, not two places that can disagree.
  useEffect(() => {
    if (!accessChecked || !hasAccess || !user) return;
    let cancelled = false;
    fetch(`/api/network?email=${encodeURIComponent(user.email)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load network (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setNetworkPeople(data.people ?? []);
        setNetworkViewerId(data.viewerId ?? null);
        setNetworkDepth(data.depth ?? { generations: 0, people: 0 });
        setNetworkLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNetworkLoaded(true);
        setNetworkError("Could not load your network. Refresh to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessChecked, hasAccess, user]);

  // Advances or lowers one person's apprenticeship step. A separate call
  // from the training-progress save machinery above: no debounce, no
  // revision guard, one request per click, straight to /api/network. The
  // API itself is the authority on whether this leader may touch this
  // person (it only writes a row whose sent_out_by matches the actor), so a
  // 403 here is a real refusal, not a local guess, and is shown against
  // that person rather than failing silently.
  const setApprenticeStep = async (id: string, step: number) => {
    if (!user) return;
    setStepUpdatingId(id);
    setStepError(null);
    try {
      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-apprentice-step", actorEmail: user.email, id, step }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Could not update that step (${res.status})`);
      }
      setNetworkPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, apprenticeStep: step } : p))
      );
    } catch (e) {
      setStepError({ id, message: (e as Error).message });
    } finally {
      setStepUpdatingId(null);
    }
  };

  return {
    networkPeople,
    networkViewerId,
    networkDepth,
    networkLoaded,
    networkError,
    stepUpdatingId,
    stepError,
    setApprenticeStep,
  };
}
