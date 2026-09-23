"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { WorksheetKind } from "@/lib/worksheets";

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

  // Typed values the server has not confirmed yet, by section.
  const pendingRef = useRef(new Map<string, unknown>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Set<string>());
  const sendRef = useRef<(section: string) => Promise<void>>(async () => {});

  useEffect(() => {
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
  }, [kind, enabled]);

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
      if (!pendingRef.current.has(section)) return;
      if (inFlightRef.current.has(section)) {
        // One request per section at a time: try again after this one lands.
        schedule(section, SAVE_DEBOUNCE_MS);
        return;
      }
      const value = pendingRef.current.get(section);
      inFlightRef.current.add(section);
      setSavingSection(section);
      try {
        const res = await leaderFetch("/api/worksheets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, section, value }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Save failed (${res.status})`);
        if (pendingRef.current.get(section) === value) pendingRef.current.delete(section);
        const server = (body.data ?? {}) as Record<string, unknown>;
        setData({ ...server, ...Object.fromEntries(pendingRef.current) } as Partial<T>);
        setSaveError(null);
      } catch {
        setSaveError(NOT_SAVED_MESSAGE);
      } finally {
        inFlightRef.current.delete(section);
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

  // Warn before leaving with unsaved typing, and send anything still
  // waiting when the page unmounts.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    const timers = timersRef.current;
    const pending = pendingRef.current;
    const inFlight = inFlightRef.current;
    return () => {
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

  return { data, loaded, error, saveSection, flushSection, savingSection, saveError };
}
