import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

/**
 * Crawlers get the catalogue and nothing else. The player routes hold no
 * indexable text and their manifests are signed and short-lived; `/account` is
 * the viewer's own pages and 404s for anyone else anyway.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/api/", "/movies/*/watch", "/series/*/watch"],
      },
    ],
    sitemap: site ? new URL("/sitemap.xml", site).toString() : undefined,
  };
}
