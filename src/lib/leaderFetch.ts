"use client";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";

function toLogin(): void {
  logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// fetch for leader APIs: attaches the Supabase access token. With no
// session it sends the leader to /login and rejects, so callers' existing
// error paths run. A 401 from the server does the same.
export async function leaderFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    toLogin();
    throw new Error("Please sign in again");
  }
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) toLogin();
  return res;
}
