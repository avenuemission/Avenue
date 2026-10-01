import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/server/securityHeaders";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Turbopack keeps a build cache between builds (on by default in Next 16.3).
  // It served a stale globals.css twice (28 Sep and 1 Oct: the live site kept
  // the old styles while the HTML was new), locally and on Netlify, so it is
  // off. Builds take seconds without it.
  experimental: {
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          dev: process.env.NODE_ENV === "development",
        }),
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Filenames in public/images are not versioned, so a week with
        // background revalidation rather than immutable.
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
