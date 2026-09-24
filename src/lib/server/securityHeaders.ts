// Security headers for every page, applied from next.config.ts headers().
// Netlify ignores netlify.toml [[headers]] for pages Next renders, so this is
// the one place they live.
//
// The CSP is static (no nonce) so pages stay statically rendered. That means
// 'unsafe-inline' for scripts (App Router hydration scripts, the gtag and Meta
// pixel bootstraps in layout.tsx) and styles; the origin lists below are the
// real protection.

type Header = { key: string; value: string };

type FetchDirective =
  | "script-src"
  | "style-src"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "frame-src"
  | "media-src";

// The GA4 property is linked to Google Ads (AW-10891164606), so gtag.js also
// loads and beacons to the Ads hosts. Listed per Google's tag CSP guide; the
// .com.au host is for Australian visitors, whose beacons use the local domain.
const GOOGLE_ADS = [
  "https://googleads.g.doubleclick.net",
  "https://www.googleadservices.com",
  "https://www.google.com",
] as const;

// Every external origin the browser loads from, by directive. Grep src/ for
// https:// before adding a new embed, script or image host.
const ORIGINS: Record<FetchDirective, readonly string[]> = {
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com", // gtag.js
    ...GOOGLE_ADS,
    "https://connect.facebook.net", // Meta pixel
    "https://maps.googleapis.com", // PathwayMap
    "https://maps.gstatic.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src": [
    "'self'",
    "data:", // avatars, QR codes
    "blob:",
    "https://img.youtube.com", // training episode thumbnails
    "https://i.ytimg.com",
    "https://maps.gstatic.com",
    "https://maps.googleapis.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
    ...GOOGLE_ADS,
    "https://ad.doubleclick.net",
    "https://www.google.com.au",
    "https://www.facebook.com", // Meta pixel beacon
    "https://www.avenuemission.com", // email images, in the admin email preview on any host
  ],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    "https://maps.googleapis.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    ...GOOGLE_ADS,
    "https://ad.doubleclick.net",
    "https://www.google.com.au",
    "https://pagead2.googlesyndication.com",
    "https://www.facebook.com",
  ],
  "frame-src": [
    "https://www.youtube.com", // Streetlights album, leader training
    "https://www.youtube-nocookie.com",
    "https://open.spotify.com", // WeeklyTopic podcast
    "https://td.doubleclick.net", // Google Ads conversion frame
    "https://www.googletagmanager.com",
  ],
  "media-src": ["'self'", "blob:"], // workshop text-to-speech audio
};

function supabaseOrigin(supabaseUrl: string | undefined): URL {
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set; the CSP needs it for connect-src");
  try {
    return new URL(new URL(supabaseUrl).origin);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${supabaseUrl}`);
  }
}

type Options = { supabaseUrl: string | undefined; dev: boolean };

export function buildCsp({ supabaseUrl, dev }: Options): string {
  const supabase = supabaseOrigin(supabaseUrl);
  const wss = `wss://${supabase.host}`;

  const fetchDirectives = Object.fromEntries(
    Object.entries(ORIGINS).map(([name, sources]) => [name, [...sources]]),
  ) as Record<FetchDirective, string[]>;
  // React dev mode needs eval for call stacks; production never does.
  if (dev) fetchDirectives["script-src"].push("'unsafe-eval'");
  fetchDirectives["connect-src"].push(supabase.origin, wss);
  fetchDirectives["img-src"].push(supabase.origin);

  const parts = [
    "default-src 'self'",
    ...Object.entries(fetchDirectives).map(([name, sources]) => `${name} ${sources.join(" ")}`),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return parts.join("; ");
}

export function securityHeaders(options: Options): Header[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Content-Security-Policy", value: buildCsp(options) },
  ];
}
