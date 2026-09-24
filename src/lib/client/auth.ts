// ============================================
// LEADER AUTH
// Sign-in is an emailed numeric code (Supabase Auth). supabase-js keeps
// the real session. The small cache under avenue_auth_session only lets
// pages render a name without waiting: the server never trusts it.
// ============================================
import { supabase } from "@/lib/client/supabaseBrowser";
import { parseStoredUser } from "@/lib/client/authSession";

export interface User {
  id: string;
  email: string;
  name: string;
}

const AUTH_STORAGE_KEY = "avenue_auth_session";
const LEGACY_USERS_KEY = "avenue_users";

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function requestCode(email: string): Promise<void> {
  const res = await postJson("/api/auth/request-code", { email });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not send a code. Please try again.");
  }
}

export async function verifyCode(email: string, code: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: "email" });
  if (error || !data.session) throw new Error(error?.message || "That code did not work. Please try again.");

  const res = await fetch("/api/leader-access", {
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  const info = await res.json().catch(() => ({}));
  if (!res.ok) {
    await supabase.auth.signOut();
    throw new Error(info.error || "This email is not registered as a leader.");
  }

  const user: User = { id: data.session.user.id, email: cleanEmail, name: info.name || cleanEmail };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_USERS_KEY);
  return user;
}

// Asks for access (a new email becomes a pending leaders row and the admin
// is told; the answer is the same for an email already registered), then
// sends a sign-in code. `company` is the form's honeypot.
export async function requestAccess(name: string, email: string, company = ""): Promise<void> {
  const res = await postJson("/api/leader-access", { email: email.trim().toLowerCase(), name: name.trim(), company });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not register. Please try again.");
  }
  await requestCode(email);
}

export const logout = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USERS_KEY);
  // Local scope: signing out here never ends the leader's sessions on
  // their other devices.
  void supabase.auth.signOut({ scope: "local" });
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!session) return null;
  const user = parseStoredUser(session);
  if (!user) {
    // A corrupt cache must not crash every page that shows the nav: drop
    // it and read as signed out. supabase-js still holds the real session.
    console.error("getCurrentUser: removing a corrupt avenue_auth_session value");
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return user;
};
