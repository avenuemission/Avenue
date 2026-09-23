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
