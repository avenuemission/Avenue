"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ADMIN_KEY_EVENT, readStoredAdminKey, writeStoredAdminKey } from "@/lib/client/adminFetch";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(ADMIN_KEY_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ADMIN_KEY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The admin passcode kept in sessionStorage "avenue_admin_key". null until
// one is stored, and on the server.
export function useAdminKey(): { key: string | null; setKey(k: string): void; clear(): void } {
  const key = useSyncExternalStore(subscribe, readStoredAdminKey, () => null);
  const setKey = useCallback((k: string) => writeStoredAdminKey(k), []);
  const clear = useCallback(() => writeStoredAdminKey(null), []);
  return { key, setKey, clear };
}
