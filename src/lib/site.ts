import { cache } from "react";

import { getBranding } from "@/lib/branding";

/**
 * The origin this deployment is served from.
 *
 * Needed by anything that has to emit an *absolute* URL — `metadataBase`, the
 * sitemap, canonical links and JSON-LD — none of which can be expressed
 * relatively. Two sources, in order:
 *
 *  - `NEXT_PUBLIC_SITE_URL`, which belongs to the deployment and is the only
 *    one available before the API answers;
 *  - the `site_url` the backend carries in its branding record, so a
 *    self-hosted install that only configures the admin panel still works.
 *
 * Null when neither is set or parseable. Every caller degrades rather than
 * guessing: a wrong origin in a canonical tag is worse than no tag at all.
 */
export const getSiteUrl = cache(async (): Promise<URL | null> => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const configured = fromEnv || (await getBranding()).siteUrl;
  if (!configured) return null;

  try {
    return new URL(configured);
  } catch {
    return null;
  }
});

/** Resolves a site-relative path against the configured origin. */
export async function absoluteUrl(path: string): Promise<string | null> {
  const site = await getSiteUrl();
  return site ? new URL(path, site).toString() : null;
}
