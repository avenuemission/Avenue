// Shared set-up for admin route tests. The route test files mock
// "@/lib/server/supabaseAdmin" (getSupabaseAdmin only) and "next/cache";
// requireAdmin is the real one, driven by the env values stubbed here.
import { vi } from "vitest";
import { NextRequest } from "next/server";

export const ADMIN_KEY = "test-admin-key";

export function stubAdminEnv(): void {
  vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
}

// A request to an admin route. Pass key: null for no Authorization header.
// A string body is sent as is (for malformed JSON), anything else as JSON.
export function adminRequest(
  path: string,
  { method = "GET", body, key = ADMIN_KEY }: { method?: string; body?: unknown; key?: string | null } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  if (key !== null) headers.authorization = `Bearer ${key}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
