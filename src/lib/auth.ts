// ============================================
// LEADER AUTH
// Sign-in is an emailed 6-digit code (Supabase Auth). supabase-js keeps
// the real session. The small cache under avenue_auth_session only lets
// pages render a name without waiting: the server never trusts it.
// ============================================
import { supabase } from "@/lib/supabase";

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

// Creates a pending leaders row (admin is notified), then sends a code.
export async function requestAccess(name: string, email: string): Promise<void> {
  const res = await postJson("/api/leader-access", { email: email.trim().toLowerCase(), name: name.trim() });
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
  void supabase.auth.signOut();
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  return session ? (JSON.parse(session) as User) : null;
};

export const isAuthenticated = (): boolean => getCurrentUser() !== null;
