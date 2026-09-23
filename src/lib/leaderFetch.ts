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
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("leaderFetch: getSession failed", error);
    // A network blip or auth outage (status 0, missing, or 5xx, e.g.
    // AuthRetryableFetchError) must not sign the leader out: surface it
    // through the page's normal error path instead.
    const status = (error as { status?: number }).status;
    if (status === undefined || status === 0 || status >= 500) {
      throw new Error("Can't reach the sign-in service. Check your connection and try again.");
    }
    toLogin();
    throw new Error(`Please sign in again: ${error.message}`);
  }
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
