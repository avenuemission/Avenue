import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/lib/client/auth";
import { leaderFetch } from "@/lib/client/leaderFetch";
import { INITIAL_PHASES, Phase, CheckpointStatus } from "@/content/training/phases";
import { reconcilePhases, extractProgressIds, mergeAgainstBase } from "@/lib/domain/trainingProgress";

// Training progress for the leader training page: the initial load, the
// debounced, serialised, revision-guarded save engine (three-way merge on a
// 409), and the two tick handlers. Moved out of page.tsx verbatim; the
// comments below still read as they did there. accessChecked and hasAccess
// gate the load effect exactly as they did in the page.
export function useTrainingProgress(user: User | null, accessChecked: boolean, hasAccess: boolean) {
  const [phases, setPhases] = useState<Phase[]>(INITIAL_PHASES);

  // Progress load state. Task 5 consumes checkpointStatus to lock phase 3
  // and render the Calling checkpoint; this task only fetches it and holds
  // it, so it is intentionally unread here.
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<CheckpointStatus | null>(null);

  // Debounced save state.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const phasesRef = useRef<Phase[]>(phases);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The row's revision, as last seen from the server (either the initial GET
  // or the outcome of a save). This is a ref rather than state: nothing in
  // the UI renders it, and performSave must always read whatever is current
  // at fire time, the same reason phasesRef exists instead of closing over
  // `phases`. Every save sends revisionRef.current + 1; a successful save or
  // a 409 conflict response both replace it with whatever the server says is
  // now current.
  const revisionRef = useRef<number | null>(null);

  // The last server state this page's local edits are known to be relative
  // to: watched episode ids and completed module ids as of the last
  // successful sync, not as of whatever a save most recently sent. This is
  // the "base" in a three-way merge (base, mine, theirs) used to resolve a
  // 409 - see mergeAgainstBase above. It is set:
  //   - on the initial GET, to what the server returned
  //   - after any save that succeeds outright, to what that save sent
  //   - after a merge-and-save (the chained save that follows a 409)
  //     succeeds, to the merged state that save sent - this falls out of
  //     the previous rule for free, since the merged state becomes that
  //     save's own "sent" payload
  // It must NOT move on a save that fails for a reason other than 409 (a
  // network error, a 500): nothing was applied there, so the state this
  // page's edits are relative to has not changed.
  const baseRef = useRef<{ watchedEpisodes: string[]; completedModules: string[] }>({
    watchedEpisodes: [],
    completedModules: [],
  });

  // Shown briefly after a 409 conflict overwrites local state with the
  // server's copy, so a leader whose click silently lost is told why,
  // instead of the tick just vanishing with no explanation.
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const conflictNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleConflictNoticeClear = useCallback(() => {
    if (conflictNoticeTimeoutRef.current) clearTimeout(conflictNoticeTimeoutRef.current);
    conflictNoticeTimeoutRef.current = setTimeout(() => {
      conflictNoticeTimeoutRef.current = null;
      setConflictNotice(null);
    }, 6000);
  }, []);

  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);

  // Load saved progress once the session and access checks have both passed.
  // Until this resolves the page keeps showing its loading treatment: a
  // returning leader must never see an empty journey flash before their
  // watched episodes and completed modules land.
  useEffect(() => {
    if (!accessChecked || !hasAccess || !user) return;
    let cancelled = false;
    leaderFetch("/api/leader-training")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load progress (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const progress = data.progress ?? {};
        const loadedPhases = reconcilePhases(
          progress.watchedEpisodes ?? [],
          progress.completedModules ?? []
        );
        setPhases(loadedPhases);
        // Assigned directly (not left to the `useEffect` that syncs it from
        // `phases`), same reasoning as revisionRef below: that effect only
        // runs after React commits and paints, which is later than a save
        // that could in principle fire before the first render settles. Kept
        // uniform with the 409 branch of performSave, where this is not
        // optional (see the comment there).
        phasesRef.current = loadedPhases;
        // base starts as exactly what the server returned, derived the same
        // way `local` and a save's own payload are (extractProgressIds over
        // a Phase[] tree), so all three are always compared on like terms -
        // an id the raw API response carried that no longer exists in
        // INITIAL_PHASES is excluded from base exactly as it is from local.
        baseRef.current = extractProgressIds(loadedPhases);
        setCheckpointStatus((progress.checkpointStatus as CheckpointStatus) ?? "none");
        // Assigned directly (not left to a syncing effect) so the very first
        // save this page can send never races ahead of knowing the row's
        // real starting revision.
        revisionRef.current = typeof progress.revision === "number" ? progress.revision : 0;
        setProgressLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Could not load your training progress. Please refresh the page to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessChecked, hasAccess, user]);

  // Whether a PUT is currently in flight, and whether state changed again
  // while it was. These are refs, not state, because they gate synchronous
  // decisions inside runSave and must never trigger a render themselves.
  const inFlightRef = useRef(false);
  const dirtyRef = useRef(false);

  // A single save attempt. Collects the current watched episode ids and
  // completed module ids from phasesRef (not `phases`, since this can fire
  // long after the tick that scheduled it) and PUTs them, carrying the
  // revision this save believes it is advancing to.
  const performSave = useCallback(async () => {
    if (!user) return;
    // Nothing to save against yet: the initial GET has not landed. This
    // should not be reachable in practice (the interactive UI that calls
    // scheduleSave only renders once progressLoaded is true, which is set
    // in the same pass as revisionRef), but guards against sending a
    // malformed revision if it ever is.
    if (revisionRef.current === null) return;

    // Captured now, before the request goes out, so that if this save
    // conflicts we can tell exactly what changed locally afterward: the
    // difference between this snapshot and whatever phasesRef holds when
    // the response comes back.
    const { watchedEpisodes: sentWatched, completedModules: sentCompleted } = extractProgressIds(
      phasesRef.current
    );
    const nextRevision = revisionRef.current + 1;
    try {
      const res = await leaderFetch("/api/leader-training", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchedEpisodes: sentWatched,
          completedModules: sentCompleted,
          revision: nextRevision,
        }),
      });

      if (res.status === 409) {
        // Another tab or device saved a newer revision first. Rather than
        // discarding whatever this page's local state holds now, or
        // blindly retrying and fighting whatever made the change, a
        // three-way merge (base, mine, theirs) is used: base is baseRef,
        // the last server state this page's edits are known to be relative
        // to, NOT the payload that was just sent. Comparing against the
        // sent payload instead of base was tried first and was wrong: an id
        // that IS the sent payload's own content is then neither an
        // addition nor a removal relative to itself, and survives only if
        // the server happens to already have it independently, which it
        // usually does not, since that is exactly why the save conflicted.
        // See mergeAgainstBase above for the full reasoning.
        const body = await res.json().catch(() => null);
        let serverProgress = body?.progress ?? null;

        if (!serverProgress) {
          // The 409 body was unusable (parse failure, or a shape with no
          // progress). Leaving revisionRef untouched here would mean every
          // later save keeps resending the exact number that was just
          // refused, locking saving permanently. Fall back to a plain GET to
          // resynchronise instead.
          try {
            const freshRes = await leaderFetch(
              "/api/leader-training"
            );
            if (freshRes.ok) {
              const freshBody = await freshRes.json().catch(() => null);
              serverProgress = freshBody?.progress ?? null;
            }
          } catch {
            // Network failure on the fallback GET too; fall through to the
            // failed-save handling below.
          }
        }

        if (!serverProgress) {
          // Nothing was applied and nothing here is being adopted, so base
          // must not move either: it still correctly describes the state
          // this page's (still-unsaved) local edits are relative to.
          setSaveError("Could not save your progress. It is kept on this page, try again shortly.");
          return;
        }

        // Whatever phasesRef holds right now reflects every local edit made
        // since base was last set, including one made while this very
        // request was in flight: the difference between base and this
        // snapshot is exactly what this page has changed, ticks and
        // un-ticks both, regardless of whether any particular id happened
        // to be part of what this specific request sent. Merging that
        // difference onto the server's copy, rather than comparing against
        // the sent payload or replacing local state with the server's copy
        // wholesale, is what keeps every local edit (the one that triggered
        // this save included) from silently vanishing when a conflict
        // resolves.
        const { watchedEpisodes: localWatched, completedModules: localCompleted } = extractProgressIds(
          phasesRef.current
        );
        const mergedWatched = mergeAgainstBase(
          serverProgress.watchedEpisodes ?? [],
          baseRef.current.watchedEpisodes,
          localWatched
        );
        const mergedCompleted = mergeAgainstBase(
          serverProgress.completedModules ?? [],
          baseRef.current.completedModules,
          localCompleted
        );

        // phasesRef is assigned directly here, not left to the useEffect
        // that normally syncs it from phases, because that effect only
        // runs after React commits and paints. If an edit landed while this
        // request was in flight, runSave's dirty flag makes it call
        // performSave() again immediately, in the same microtask turn, well
        // before that effect has a chance to run. Without this direct
        // assignment, that chained call would read a stale phasesRef
        // instead of the merged state just computed above.
        const mergedPhases = reconcilePhases(mergedWatched, mergedCompleted);
        setPhases(mergedPhases);
        phasesRef.current = mergedPhases;
        const serverRevision =
          typeof serverProgress.revision === "number" ? serverProgress.revision : revisionRef.current;
        revisionRef.current = serverRevision;

        // base is deliberately NOT updated here. It only moves once a save
        // actually succeeds (see the success branch below), and the merged
        // state has not been sent anywhere yet, only adopted locally. The
        // next performSave call, fired immediately below, will capture this
        // merged state as ITS OWN sent payload, and if that save succeeds,
        // base becomes the merged state via the ordinary success-path rule,
        // which is exactly the "after a merge-and-save succeeds" case.
        //
        // dirtyRef is explicitly set here, not just left at whatever it
        // already was. Round 2 only left it as-is, on the assumption that
        // the merge needed re-saving exactly when a during-flight edit had
        // set it. That assumption does not hold once the merge compares
        // against base instead of the sent payload: the merged state can
        // (and, in the plain "no edit during the flight" case, always does)
        // differ from what the server has, purely because it restores the
        // sent payload's own content, with no during-flight edit involved
        // at all. That difference still needs to reach the server, so
        // runSave's loop must fire again regardless of dirtyRef's prior
        // value; setting it unconditionally is what makes that happen.
        dirtyRef.current = true;
        setSaveError(null);
        setConflictNotice(
          "Your progress was merged with an update from elsewhere."
        );
        scheduleConflictNoticeClear();
        return;
      }

      if (!res.ok) throw new Error(`Save failed (${res.status})`);

      const body = await res.json();
      const savedRevision = typeof body?.progress?.revision === "number" ? body.progress.revision : nextRevision;
      revisionRef.current = savedRevision;
      // This save's own payload is now confirmed persisted, so it becomes
      // the new base: the state this page's future edits are relative to,
      // whether this was an ordinary save or the merged save chained after
      // a 409 (in which case sentWatched/sentCompleted here ARE the merged
      // arrays, since they were captured from phasesRef at the top of this
      // same call, after the merge had already been adopted into it).
      baseRef.current = { watchedEpisodes: sentWatched, completedModules: sentCompleted };
      setSaveError(null);
    } catch {
      // Never revert a leader's tick because the network failed, and never
      // move base: nothing was applied, so the state this page's edits are
      // relative to has not changed. Local state is left exactly as it is;
      // only the error banner changes.
      setSaveError("Could not save your progress. It is kept on this page, try again shortly.");
    }
  }, [scheduleConflictNoticeClear, user]);

  // Serialises saves so at most one PUT is ever in flight. Two overlapping
  // full-overwrite PUTs race: whichever response lands last at the server
  // wins, and that is not necessarily the one holding the latest tick. If a
  // tick arrives while a save is already running, it is marked dirty rather
  // than firing a second request; the moment the in-flight save finishes,
  // one more save goes out carrying whatever is current at that point. That
  // gives last-write-wins with correct ordering, at the cost of an extra
  // round trip on a slow connection, never a lost tick.
  const runSave = useCallback(async () => {
    if (inFlightRef.current) {
      dirtyRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    let more = true;
    while (more) {
      dirtyRef.current = false;
      await performSave();
      more = dirtyRef.current;
    }
    inFlightRef.current = false;
    setSaving(false);
  }, [performSave]);

  // Every tick clears the pending timeout and schedules a new one 800ms out,
  // so rapid ticking sends one request rather than one per click.
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      runSave();
    }, 800);
  }, [runSave]);

  // Clear the pending timeouts on unmount so a save, or a notice clear,
  // cannot fire after the component is gone.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (conflictNoticeTimeoutRef.current) clearTimeout(conflictNoticeTimeoutRef.current);
    };
  }, []);

  const toggleModuleComplete = (phaseId: string, moduleId: string) => {
    setPhases((prev) =>
      prev.map((phase) => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            modules: phase.modules.map((m) =>
              m.id === moduleId ? { ...m, completed: !m.completed } : m
            ),
          };
        }
        return phase;
      })
    );
    scheduleSave();
  };

  const toggleEpisodeWatched = (phaseId: string, moduleId: string, episodeId: string) => {
    setPhases((prev) =>
      prev.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const updatedModules = phase.modules.map((m) => {
          if (m.id !== moduleId || !m.episodes) return m;
          const updatedEpisodes = m.episodes.map((e) =>
            e.id === episodeId ? { ...e, watched: !e.watched } : e
          );
          const allWatched = updatedEpisodes.every((e) => e.watched);
          return { ...m, episodes: updatedEpisodes, completed: allWatched };
        });
        return { ...phase, modules: updatedModules };
      })
    );
    scheduleSave();
  };

  return {
    phases,
    progressLoaded,
    loadError,
    checkpointStatus,
    saving,
    saveError,
    conflictNotice,
    toggleModuleComplete,
    toggleEpisodeWatched,
  };
}
