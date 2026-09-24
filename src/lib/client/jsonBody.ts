// A response's JSON body as a plain object, or null when there is none
// (an HTML error page, an empty body, an array). Never throws, so a caller
// can always leave its loading state.
export async function jsonBody(res: Response): Promise<Record<string, unknown> | null> {
  const body: unknown = await res.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
