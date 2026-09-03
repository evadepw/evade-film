/**
 * Runtime API configuration.
 *
 * The browser and the server reach the backend at different addresses, and not
 * only because a container may know it by another name: the browser does not
 * call it directly at all. Requests from the page go to this app's own origin
 * and are proxied on by the rewrite in `next.config.ts`, because the catalog
 * API sends no CORS headers and every authenticated call is made client-side.
 * Everything else is shared.
 */

/**
 * Deliberately short. A server component awaits this inline, so a hanging API
 * holds the whole RSC stream open and the page renders but never becomes
 * interactive. Failing fast puts the viewer in front of an error state they can
 * retry instead.
 */
const DEFAULT_TIMEOUT_MS = 8_000;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Mock mode serves the catalogue from fixtures instead of the network, so the
 * frontend stays workable when the backend is down. It is opt-in per
 * environment and never inferred from a failed request — a silently mocked
 * production is far worse than a visible outage.
 */
function resolveUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_API_MOCK === "true";
}

/** Stands in for the origin in mock mode; no request ever leaves the process. */
const MOCK_BASE_URL = "http://mock.evade.local";

function resolveBaseUrl(): string {
  // Checked first: in mock mode the adapter answers before anything is sent,
  // but axios still needs an absolute base to resolve the request URL against.
  if (resolveUseMocks()) return MOCK_BASE_URL;

  // In the browser the origin is this app's own, spelled as the empty string so
  // axios keeps the URL relative. The rewrite forwards `/api/*` from here.
  if (typeof window !== "undefined") return "";

  const raw = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local and point it at the catalog API, or set NEXT_PUBLIC_API_MOCK=true to work against fixtures.",
    );
  }

  return stripTrailingSlash(raw);
}

function resolveTimeout(): number {
  const parsed = Number(process.env.NEXT_PUBLIC_API_TIMEOUT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export const apiConfig = {
  /**
   * Origin only — path prefixes live in `endpoints.ts`. Empty in the browser,
   * where requests are relative to this app and proxied on by Next.
   */
  get baseUrl(): string {
    return resolveBaseUrl();
  },
  get timeout(): number {
    return resolveTimeout();
  },
  /** When true, `http()` answers from `lib/api/mock` instead of the network. */
  get useMocks(): boolean {
    return resolveUseMocks();
  },
} as const;

/** Page size the backend's pagination uses. Kept here so grids can size skeletons. */
export const API_PAGE_SIZE = 20;
