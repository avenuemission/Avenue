"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { WorksheetKind } from "@/lib/worksheets";
import {
  beginResetEpoch,
  RESET_WAIT_MS,
  resetEpoch,
  saveEnded,
  saveStarted,
  savesInFlight,
  waitForIdle,
} from "@/lib/worksheetReset";

export const SAVE_DEBOUNCE_MS = 600;
export const NOT_SAVED_MESSAGE = "Not saved yet, retrying when you next change it";

type SectionKey<T> = Extract<keyof T, string>;

// Loads one worksheet and saves it a section at a time. A change shows
// immediately, then saves 600 ms after the last change to that section.
// Only that section is sent; the server merges it and returns the whole
// document, which replaces local data except for sections still waiting
// to save (those keep what the leader typed). A failed save keeps the
// typed value and retries on the next change to that section.
export function useWorksheet<T extends object>(kind: WorksheetKind, enabled: boolean) {
  const [data, setData] = useState<Partial<T>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Bumped by reset() to re-run the load below after a delete.
  const [reloadKey, setReloadKey] = useState(0);

  // Typed values the server has not confirmed yet, by section.
  const pendingRef = useRef(new Map<string, unknown>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Set<string>());
  const sendRef = useRef<(section: string) => Promise<void>>(async () => {});
  // Set when the page unmounts, so a save that was already in flight (and
  // so skipped by the unmount flush) and then fails is retried once rather
  // than losing the typing silently.
  const unmountedRef = useRef(false);
  // True while reset() runs: send does nothing (queued values stay queued),
  // so no save can write an old answer back after the delete (round 3
  // spec 2).
  const resettingRef = useRef(false);
  // The page-wide reset epoch this copy loaded under. A copy that loaded
  // before a later reset (a wizard that has unmounted but still gets a late
  // APEST reflection) drops its saves instead of writing old answers back.
  const epochRef = useRef(0);

  useEffect(() => {
    epochRef.current = resetEpoch(kind);
    if (!enabled) return;
    let cancelled = false;
    leaderFetch(`/api/worksheets?kind=${kind}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setData((body.data ?? {}) as Partial<T>);
        setLoaded(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(`Could not load your answers. ${e.message}`);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, enabled, reloadKey]);

  const schedule = useCallback((section: string, delay: number) => {
    const existing = timersRef.current.get(section);
    if (existing) clearTimeout(existing);
    timersRef.current.set(
      section,
      setTimeout(() => {
        timersRef.current.delete(section);
        void sendRef.current(section);
      }, delay)
    );
  }, []);

  useEffect(() => {
    sendRef.current = async (section: string) => {
      if (resettingRef.current) return;
      if (!pendingRef.current.has(section)) return;
      if (epochRef.current !== resetEpoch(kind)) {
        // This worksheet was reset after this copy loaded: an old answer
        // must not be written back (round 3 spec 2).
        pendingRef.current.delete(section);
        console.warn(`Worksheet save dropped after a reset (${kind}.${section})`);
        return;
      }
      if (inFlightRef.current.has(section)) {
        // One request per section at a time: try again after this one lands.
        schedule(section, SAVE_DEBOUNCE_MS);
        return;
      }
      const value = pendingRef.current.get(section);
      inFlightRef.current.add(section);
      saveStarted(kind);
      setSavingSection(section);
      const patch = async (sent: unknown, keepalive: boolean) => {
        const res = await leaderFetch("/api/worksheets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, section, value: sent }),
          keepalive,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Save failed (${res.status})`);
        if (pendingRef.current.get(section) === sent) pendingRef.current.delete(section);
        return (body.data ?? {}) as Record<string, unknown>;
      };
      try {
        const server = await patch(value, false);
        setData({ ...server, ...Object.fromEntries(pendingRef.current) } as Partial<T>);
        setSaveError(null);
      } catch (firstError) {
        setSaveError(NOT_SAVED_MESSAGE);
        if (unmountedRef.current && pendingRef.current.has(section)) {
          // Nothing will call send again for this section once the page is
          // gone: retry once now with the newest typed value. inFlight
          // stays set until this finishes, so no second request races it.
          try {
            await patch(pendingRef.current.get(section), true);
          } catch (retryError) {
            console.error(`Worksheet save lost after leaving the page (${kind}.${section})`, firstError, retryError);
          }
        }
      } finally {
        inFlightRef.current.delete(section);
        saveEnded(kind);
        setSavingSection((current) => (current === section ? null : current));
      }
    };
  });

  const saveSection = useCallback(
    <S extends SectionKey<T>>(section: S, value: T[S]) => {
      pendingRef.current.set(section, value);
      setData((prev) => ({ ...prev, [section]: value }) as Partial<T>);
      schedule(section, SAVE_DEBOUNCE_MS);
    },
    [schedule]
  );

  const flushSection = useCallback(async (section: SectionKey<T>) => {
    const existing = timersRef.current.get(section);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(section);
    }
    await sendRef.current(section);
  }, []);

  // Reset Calling or Reset Launch (round 3 spec 2). Queued saves are
  // stopped (their values stay queued, unsent) and the reset epoch moves,
  // so any other copy of this worksheet on the page drops its later saves.
  // Every save of this kind already on the wire, from any copy, lands
  // before the delete, so it cannot write an old answer back. If one is
  // still running after RESET_WAIT_MS this throws and deletes nothing. A
  // failed delete throws the server's message. Unsent typing is dropped
  // only once the delete succeeded; otherwise it goes back in the queue.
  // On success the worksheet is re-read through the normal load path.
  const reset = useCallback(async () => {
    resettingRef.current = true;
    for (const t of timersRef.current.values()) clearTimeout(t);
    timersRef.current.clear();
    beginResetEpoch(kind);
    let wiped = false;
    try {
      await waitForIdle(() => savesInFlight(kind) > 0, RESET_WAIT_MS);
      const res = await leaderFetch(`/api/worksheets?kind=${kind}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not reset (${res.status})`);
      wiped = true;
      pendingRef.current.clear();
      setData({});
      setSaveError(null);
      setError(null);
      setReloadKey((k) => k + 1);
    } finally {
      epochRef.current = resetEpoch(kind);
      resettingRef.current = false;
      if (!wiped) for (const section of pendingRef.current.keys()) schedule(section, SAVE_DEBOUNCE_MS);
    }
  }, [kind, schedule]);

  // Warn before leaving with unsaved typing, and send anything still
  // waiting when the page unmounts.
  useEffect(() => {
    // Reset on mount: React's development double mount runs the cleanup
    // below once before the real mount.
    unmountedRef.current = false;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    const timers = timersRef.current;
    const pending = pendingRef.current;
    const inFlight = inFlightRef.current;
    return () => {
      unmountedRef.current = true;
      window.removeEventListener("beforeunload", onBeforeUnload);
      for (const [section, t] of timers) {
        clearTimeout(t);
        void sendRef.current(section);
      }
      timers.clear();
      // A section whose last save failed has no timer (the catch path
      // does not reschedule one), so it would otherwise never be sent
      // again if the component unmounts before the next edit. Flush it
      // here too, skipping anything already in flight from the loop above.
      for (const section of pending.keys()) {
        if (!inFlight.has(section)) void sendRef.current(section);
      }
    };
  }, []);

  return { data, loaded, error, saveSection, flushSection, savingSection, saveError, reset };
}
