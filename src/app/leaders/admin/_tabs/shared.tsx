"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { adminErrorMessage, adminFetch } from "@/lib/client/adminFetch";

export interface AdminTabProps {
  adminKey: string;
}

// Runs one admin write and keeps its failure as inline text (the tabs used
// to alert() it). onSuccess runs only for a 2xx answer.
export function useAdminSave(adminKey: string) {
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (path: string, init: RequestInit, onSuccess: () => void) => {
      setError(null);
      try {
        const res = await adminFetch(path, adminKey, init);
        if (!res.ok) {
          setError(`Save failed: ${await adminErrorMessage(res)}`);
          return;
        }
        onSuccess();
      } catch (err) {
        setError(`Save failed: ${err instanceof Error ? err.message : "Network error"}`);
      }
    },
    [adminKey]
  );
  return { error, setError, run };
}

// Loads a tab's data whenever `load` changes (wrap it in useCallback with
// the inputs it reads) and again on reload(). `loading` is true until the
// answer for the current load and reload arrives, so the tab shows
// "Loading..." for a refetch just as it always has. A failure is kept as
// text for the tab to show.
export function useLoaded<T>(load: () => Promise<T>) {
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<{
    load: () => Promise<T>;
    reloads: number;
    data: T | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ load, reloads, data, error: null });
      },
      (e: unknown) => {
        console.error("admin tab: load failed", e);
        if (!cancelled) setState({ load, reloads, data: null, error: e instanceof Error ? e.message : "Could not load" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [load, reloads]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);
  const current = state !== null && state.load === load && state.reloads === reloads;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    reload,
  };
}

// A JSON body for adminFetch.
export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// Reads a list for a tab. Throws with the server's message on a non-2xx
// answer, so the tab can show it instead of an empty list.
export async function loadJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`Could not load ${what}: ${await adminErrorMessage(res)}`);
  return (await res.json()) as T;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-red-400 text-sm mb-4">
      {message}
    </p>
  );
}

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl border border-[var(--border)] bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
