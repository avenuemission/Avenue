import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "./securityHeaders";

const SUPABASE = "https://abcdefgh.supabase.co";

function header(list: { key: string; value: string }[], key: string): string {
  const found = list.find((h) => h.key === key);
  if (!found) throw new Error(`missing header ${key}`);
  return found.value;
}

function directives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";").map((p) => p.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/);
    if (map.has(name)) throw new Error(`duplicate directive ${name}`);
    map.set(name, values);
  }
  return map;
}

describe("buildCsp", () => {
  const csp = buildCsp({ supabaseUrl: SUPABASE, dev: false });
  const d = directives(csp);

  it("has every directive", () => {
    for (const name of [
      "default-src",
      "script-src",
      "style-src",
      "img-src",
      "font-src",
      "connect-src",
      "frame-src",
      "media-src",
      "object-src",
      "base-uri",
      "form-action",
      "frame-ancestors",
      "upgrade-insecure-requests",
    ]) {
      expect(d.has(name), name).toBe(true);
    }
  });

  it("has no duplicate directives or duplicate sources", () => {
    const names = csp.split(";").map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
    expect(new Set(names).size).toBe(names.length);
    for (const [name, values] of d) expect(new Set(values).size, name).toBe(values.length);
  });

  it("locks down objects, base, forms and framing", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("upgrade-insecure-requests")).toEqual([]);
  });

  it("allows inline scripts and styles but not eval in production", () => {
    expect(d.get("script-src")).toContain("'unsafe-inline'");
    expect(d.get("style-src")).toContain("'unsafe-inline'");
    expect(d.get("script-src")).not.toContain("'unsafe-eval'");
  });

  it("adds unsafe-eval to script-src in development only", () => {
    const dev = directives(buildCsp({ supabaseUrl: SUPABASE, dev: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(dev.get("style-src")).not.toContain("'unsafe-eval'");
  });

  it("lets the browser reach Supabase over https and wss", () => {
    expect(d.get("connect-src")).toContain(SUPABASE);
    expect(d.get("connect-src")).toContain("wss://abcdefgh.supabase.co");
  });

  it("allows the trackers, the map and the embeds the site uses", () => {
    expect(d.get("script-src")).toEqual(
      expect.arrayContaining(["https://www.googletagmanager.com", "https://connect.facebook.net", "https://maps.googleapis.com"]),
    );
    expect(d.get("img-src")).toEqual(
      expect.arrayContaining(["data:", "blob:", "https://img.youtube.com", "https://i.ytimg.com", "https://www.facebook.com"]),
    );
    expect(d.get("frame-src")).toEqual(
      expect.arrayContaining(["https://www.youtube.com", "https://www.youtube-nocookie.com", "https://open.spotify.com"]),
    );
    expect(d.get("media-src")).toEqual(expect.arrayContaining(["'self'", "blob:"]));
  });

  it("lets the admin email preview show images from the live site on any host", () => {
    expect(d.get("img-src")).toContain("https://www.avenuemission.com");
  });

  it("allows the Google Ads hosts the linked gtag config loads and beacons to", () => {
    expect(d.get("script-src")).toContain("https://googleads.g.doubleclick.net");
    for (const name of ["img-src", "connect-src"]) {
      expect(d.get(name), name).toEqual(
        expect.arrayContaining(["https://www.google.com", "https://ad.doubleclick.net", "https://googleads.g.doubleclick.net"]),
      );
    }
  });

  it("uses only the origin of the Supabase URL", () => {
    const withPath = directives(buildCsp({ supabaseUrl: `${SUPABASE}/rest/v1/`, dev: false }));
    expect(withPath.get("connect-src")).toContain(SUPABASE);
    expect(withPath.get("connect-src")?.some((v) => v.includes("/rest/"))).toBe(false);
  });

  it("fails loud without a valid Supabase URL", () => {
    expect(() => buildCsp({ supabaseUrl: undefined, dev: false })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => buildCsp({ supabaseUrl: "not a url", dev: false })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe("securityHeaders", () => {
  const list = securityHeaders({ supabaseUrl: SUPABASE, dev: false });

  it("sends the fixed hardening headers", () => {
    expect(header(list, "Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(header(list, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(list, "X-Frame-Options")).toBe("DENY");
    expect(header(list, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(list, "Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    expect(header(list, "Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("enforces the CSP rather than report-only", () => {
    expect(header(list, "Content-Security-Policy")).toBe(buildCsp({ supabaseUrl: SUPABASE, dev: false }));
    expect(list.some((h) => h.key === "Content-Security-Policy-Report-Only")).toBe(false);
  });

  it("never preloads HSTS", () => {
    expect(header(list, "Strict-Transport-Security")).not.toMatch(/preload/);
  });

  it("has no duplicate header keys", () => {
    const keys = list.map((h) => h.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});
