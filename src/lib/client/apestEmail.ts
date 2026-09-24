import { jsonBody } from "@/lib/client/jsonBody";

// Asks the server to email the APEST results. True only when it says the
// emails went out; false for emailed: false, an error status, a body that is
// not JSON or a network failure. The page keeps the results on screen either
// way, so this never throws.
export async function emailApestResults(body: Record<string, unknown>, fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn("/api/apest-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await jsonBody(res);
    return res.ok && data?.ok === true && data.emailed === true;
  } catch {
    return false;
  }
}
