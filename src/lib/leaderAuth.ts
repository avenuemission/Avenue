// Pure identity resolution for leader API routes. No Next.js or Supabase
// imports, so it can be unit tested with fakes. requireLeader.ts wires it
// to the real services.
//
// Order is fixed: verify the token, then check `leaders`, then return.
// Nothing about the caller is ever read from the request body or query.

export interface LeaderIdentity {
  email: string;
  name: string;
  fullAccess: boolean;
}

export type ResolveResult =
  | { ok: true; leader: LeaderIdentity }
  | { ok: false; status: 401 | 403 | 500; error: string };

export interface ResolveDeps {
  // The verified email for a token, or null when the token is invalid or
  // expired. Throws only on an outage, which becomes a 500, not a 401.
  emailForToken(token: string): Promise<string | null>;
  // The leaders row for an email, or null. Throws on a database error.
  findLeader(email: string): Promise<{ name: string | null; full_access: boolean } | null>;
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function resolveLeader(authHeader: string | null, deps: ResolveDeps): Promise<ResolveResult> {
  const token = bearerToken(authHeader);
  if (!token) return { ok: false, status: 401, error: "Sign in required" };

  try {
    const verified = await deps.emailForToken(token);
    if (!verified) return { ok: false, status: 401, error: "Session expired, please sign in again" };

    const email = verified.trim().toLowerCase();
    const row = await deps.findLeader(email);
    if (!row) return { ok: false, status: 403, error: "Not a leader account" };

    return { ok: true, leader: { email, name: row.name ?? "", fullAccess: row.full_access === true } };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
