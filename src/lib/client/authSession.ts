// The avenue_auth_session cache is only a display hint (the server never
// trusts it), so a corrupt value must never crash a page. Pure: returns
// the cached user, or null when the value is not valid JSON or not the
// expected shape.
export interface CachedUser {
  id: string;
  email: string;
  name: string;
}

export function parseStoredUser(raw: string): CachedUser | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.email !== "string" || typeof v.name !== "string") return null;
  return { id: v.id, email: v.email, name: v.name };
}

// The localStorage key for the cached user. Kept here (not in auth.ts) so
// the public Navbar can read it without pulling supabase-js into every page.
export const AUTH_STORAGE_KEY = "avenue_auth_session";

// The cached user, or null when signed out or on the server. A corrupt
// value is removed and reads as signed out; supabase-js still holds the
// real session.
export function getCurrentUser(): CachedUser | null {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!session) return null;
  const user = parseStoredUser(session);
  if (!user) {
    console.error("getCurrentUser: removing a corrupt avenue_auth_session value");
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return user;
}
