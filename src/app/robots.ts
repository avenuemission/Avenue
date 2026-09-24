import type { MetadataRoute } from "next";

// Served at /robots.txt. Every crawler may read every page; the sitemap
// lists the public pages worth indexing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.avenuemission.com/sitemap.xml",
  };
}
