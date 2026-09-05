import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/** The catalog API origin, as reachable from this process. */
function apiOrigin(): string | undefined {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  return raw ? raw.replace(/\/+$/, "") : undefined;
}

/**
 * Posters, backdrops and thumbnails are served by the backend's object storage,
 * which lives on the same host as the API but a different port. Rather than
 * hard-coding that, the allow-list is derived from the configured API origin and
 * can be extended with `NEXT_PUBLIC_IMAGE_HOSTS` (comma-separated hostnames).
 */
function imageRemotePatterns(): RemotePattern[] {
  const hosts = new Set<string>();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      hosts.add(new URL(apiUrl).hostname);
    } catch {
      // An unparseable API URL is reported at runtime by `lib/api/config.ts`;
      // here we just skip it so the build still succeeds.
    }
  }

  for (const host of (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(",")) {
    const trimmed = host.trim();
    if (trimmed) hosts.add(trimmed);
  }

  // `port` is deliberately omitted: media sits on a different port than the API
  // and an absent `port` matches any.
  return [...hosts].flatMap((hostname): RemotePattern[] => [
    { protocol: "http", hostname },
    { protocol: "https", hostname },
  ]);
}

/**
 * Next refuses to optimise images whose host resolves to a private IP — an SSRF
 * guard. A self-hosted catalog backend on a LAN address is exactly that case, so
 * the guard has to be lifted deliberately, per environment, and never by
 * default. Only enable it when the image hosts above are ones you control.
 */
const allowLocalImageHosts = process.env.IMAGES_ALLOW_LOCAL_IP === "true";

const nextConfig: NextConfig = {
  /**
   * Traces the server and only the `node_modules` it actually reaches into
   * `.next/standalone`, so the Docker image carries a runtime rather than a
   * dependency tree. `public/` and `.next/static` are excluded from that trace
   * on the assumption a CDN serves them — there is none here, so the Dockerfile
   * copies them back in.
   */
  output: "standalone",

  images: {
    remotePatterns: imageRemotePatterns(),
    dangerouslyAllowLocalIP: allowLocalImageHosts,
  },

  /**
   * The catalog API answers only on paths that end in a slash (DRF's
   * `APPEND_SLASH`), and Next's default is to redirect those away before a
   * rewrite is ever consulted — `/api/v1/…/rating/` became a 308 to the
   * slashless path, which the backend then bounced back to its own origin, and
   * the browser was cross-origin again.
   *
   * So the automatic redirect is turned off and reinstated below for
   * everything except `/api`, where the slash is part of the contract.
   */
  skipTrailingSlashRedirect: true,

  /**
   * The headers that cost nothing to be right about.
   *
   * No CSP here on purpose. A useful one has to name the vendored player, the
   * media origin, the inline JSON-LD and Next's own inline bootstrap, and a CSP
   * that is wrong is a blank page rather than a warning — it belongs in its own
   * change, rolled out `-Report-Only` first. These four are unconditional.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrers stay useful same-origin and become bare origins outside,
          // so a title someone was watching does not travel to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The player is ours to frame; nobody else's page may frame it.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // What `skipTrailingSlashRedirect` switched off, minus the API: a page
      // still has one canonical URL, and it is the one without the slash.
      { source: "/:path((?!api/).*)/", destination: "/:path", permanent: true },
    ];
  },

  /**
   * The API under this app's own origin.
   *
   * Server components can call the backend directly, but anything to do with
   * the signed-in viewer runs in the browser — and a browser calling
   * `localhost:8000` from `localhost:3000` is a cross-origin request the
   * catalog API does not answer (no `Access-Control-Allow-Origin`).
   *
   * Proxying rather than asking the backend for CORS headers: the allow-list
   * would have to name every frontend origin in every environment, and get it
   * right again on each deploy. Here the browser only ever talks to the origin
   * it was served from, and `lib/api/config.ts` points client requests at this
   * path. The Authorization header rides through untouched.
   */
  async rewrites() {
    const origin = apiOrigin();
    if (!origin) return [];

    return [
      // The slashed form comes first and re-adds the slash the pattern eats:
      // `:path*` captures segments only, so a single rule would forward
      // `/api/v1/…/rating/` as `/api/v1/…/rating` and earn a 301 from Django.
      { source: "/api/:path*/", destination: `${origin}/api/:path*/` },
      { source: "/api/:path*", destination: `${origin}/api/:path*` },
    ];
  },
};

export default nextConfig;
