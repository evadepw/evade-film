"use client";

import { useCallback, useRef } from "react";
import type { PlaybackErrorDetail } from "evade-player";

import type { PlayerHandle } from "@/components/player/video-player";

/**
 * HTTP statuses that mean "the signature is no longer valid", as opposed to
 * "the network is down" or "the file is gone". Only these are worth a retry:
 * on anything else a fresh URL would fail exactly the same way.
 */
const EXPIRED = new Set([401, 403]);

/**
 * Whether this failure is one a fresh manifest can fix.
 *
 * Pure and exported so the decision can be tested without a player: it is the
 * part with real branching, and getting it wrong is either a dead player or a
 * request loop.
 */
export function isRecoverable(error: PlaybackErrorDetail): boolean {
  // Non-fatal errors are ones the player already absorbed — a stalled buffer,
  // a segment it re-requested. Nothing to do.
  if (!error.fatal) return false;
  // Anything else — no network, a deleted file, an unplayable codec — fails
  // the same way on a freshly signed URL.
  return error.status !== undefined && EXPIRED.has(error.status);
}

export interface ManifestRecoveryOptions {
  /**
   * Fetches a freshly signed manifest for whatever is playing right now.
   * Returns null when the backend has nothing to give — the player then keeps
   * its own error on screen.
   */
  refresh: () => Promise<string | null>;
}

/**
 * Recovers playback from an expired signed manifest.
 *
 * Manifest URLs carry a short-lived signature. A viewer who pauses long enough
 * comes back to a dead link, and until the player grew a `playbackerror` event
 * the only thing the page could do was tell them to reload it by hand.
 *
 * The replacement URL is fetched **outside** React Query on purpose. Refetching
 * the playback query would change the `src` that renders, and the surface is
 * keyed by it — React would remount the player and undo the very thing
 * `reload()` exists to avoid. This path never touches the render tree: the new
 * URL goes straight to the element.
 */
export function useManifestRecovery({ refresh }: ManifestRecoveryOptions) {
  const player = useRef<PlayerHandle>(null);
  /** One attempt per failure. A backend signing dead links must not become a loop. */
  const recovering = useRef(false);

  const onPlaybackError = useCallback(
    (error: PlaybackErrorDetail) => {
      if (!isRecoverable(error)) return;
      if (recovering.current) return;

      recovering.current = true;
      const resumeAt = error.time;

      void refresh()
        .then((src) => {
          if (src) player.current?.reload(src, { time: resumeAt });
        })
        .catch(() => {
          // The player is already showing `errorDescription`; a failed rescue
          // adds nothing the viewer can act on.
        })
        .finally(() => {
          recovering.current = false;
        });
    },
    [refresh],
  );

  return { playerRef: player, onPlaybackError };
}
