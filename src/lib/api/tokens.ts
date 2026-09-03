import type { TokenPairDto } from "./types";

/**
 * Where the JWT pair lives.
 *
 * Browser only, deliberately. The axios instance in `http.ts` is a
 * module-level singleton shared by every server render, so a token parked on it
 * during an RSC pass would be handed to whoever renders next — one visitor's
 * session leaking into another's page. Authenticated reads therefore happen on
 * the client, and server components render the catalogue as an anonymous
 * visitor. See the "Аккаунт" section of the README.
 *
 * `localStorage` and not a cookie for the same reason: a cookie would be sent
 * on the RSC fetch too, which is exactly the boundary being kept.
 */

const STORAGE_KEY = "evade.auth";

export interface TokenPair {
  access: string;
  refresh: string;
}

type Listener = (tokens: TokenPair | null) => void;

const listeners = new Set<Listener>();

/** Mirrors storage so reads during a render never touch `localStorage`. */
let cached: TokenPair | null | undefined;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parse(raw: string | null): TokenPair | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TokenPairDto>;
    if (typeof parsed.access !== "string" || typeof parsed.refresh !== "string") return null;
    return { access: parsed.access, refresh: parsed.refresh };
  } catch {
    return null;
  }
}

export function readTokens(): TokenPair | null {
  if (!isBrowser()) return null;
  if (cached === undefined) {
    try {
      cached = parse(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Private mode, or storage disabled: the session simply does not persist.
      cached = null;
    }
  }
  return cached;
}

export function writeTokens(tokens: TokenPair | null): void {
  cached = tokens;

  if (isBrowser()) {
    try {
      if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal: the session lives for this tab only.
    }
  }

  for (const listener of listeners) listener(tokens);
}

/**
 * Notified on sign-in, sign-out and on a refresh that fails — which is how the
 * auth provider learns that a session died mid-request. Also picks up sign-outs
 * from another tab.
 */
export function subscribeToTokens(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = parse(event.newValue);
    listener(cached);
  };

  if (isBrowser()) window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", onStorage);
  };
}
