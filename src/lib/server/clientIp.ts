import "server-only";

// The caller's IP for rate limiting. Netlify sets x-nf-client-connection-ip
// on every request it proxies to a function; that header cannot be spoofed
// by the client, unlike x-forwarded-for, which is used only as a fallback
// (its first entry is the original client when present). "unknown" groups
// together any request where neither header is set, which only ever happens
// outside Netlify (e.g. a local test run).
export function clientIp(request: Request): string {
  const nf = request.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
