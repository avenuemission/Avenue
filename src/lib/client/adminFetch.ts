"use client";

// The admin passcode lives in sessionStorage under this name, so it lasts
// for the browser tab and never reaches localStorage.
export const ADMIN_KEY_STORAGE = "avenue_admin_key";
// Fired on window whenever the stored key changes, so useAdminKey follows.
export const ADMIN_KEY_EVENT = "avenue-admin-key";

export function readStoredAdminKey(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function writeStoredAdminKey(key: string | null): void {
  try {
    if (key === null) sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    else sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch (e) {
    console.error("adminFetch: sessionStorage unavailable", e);
  }
  window.dispatchEvent(new Event(ADMIN_KEY_EVENT));
}

// fetch for admin APIs: sends the passcode as a Bearer token. A 401 means
// the key is wrong or has changed, so the stored copy is cleared and the
// admin page falls back to its sign-in form.
export async function adminFetch(path: string, key: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${key}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401 && readStoredAdminKey() !== null) writeStoredAdminKey(null);
  return res;
}

// The error text an admin sees for a failed response: the server's own
// message when it sent one, else the status.
export async function adminErrorMessage(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  const message = typeof body === "object" && body !== null ? (body as { error?: unknown }).error : undefined;
  return typeof message === "string" && message !== "" ? message : `${res.status} ${res.statusText}`.trim();
}
